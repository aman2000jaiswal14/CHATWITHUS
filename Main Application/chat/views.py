import json
import os
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.views.decorators.http import require_POST
from django.views.decorators.csrf import csrf_exempt
from .models import Bookmark, ChatGroup, Message, ChatReadCursor
from django.db.models import Max, Q
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

User = get_user_model()


def get_authenticated_user(request):
    """Identify user from X-Chat-User header for plug-and-play mode."""
    username = request.headers.get('X-Chat-User')
    if not username:
        return None
    try:
        return User.objects.get(username=username)
    except User.DoesNotExist:
        return None


def broadcast_group_refresh(group_id, reason='update'):
    """Broadcast a refresh signal to all members of a group."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'group_{group_id}',
        {
            'type': 'group.refresh',
            'reason': reason
        }
    )


def notify_user_refresh(username):
    """Notify a specific user to refresh their groups (e.g. when added to a new group)."""
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f'user_{username}',
        {
            'type': 'group.refresh',
            'reason': 'added_to_group'
        }
    )


def create_system_message(group, content):
    """Helper to create and broadcast a system message (type 4) to a group."""
    import uuid
    from chat.handlers.message_handler import MessageHandler
    
    # We use the group creator or any admin as a dummy sender for the model 
    # but the frontend will render it as a system message based on type=4.
    sender = group.creator or User.objects.filter(is_superuser=True).first()
    if not sender:
        return None
        
    msg = Message.objects.create(
        sender=sender,
        group=group,
        content=content,
        message_type=4,  # System Message
        message_id=str(uuid.uuid4())
    )
    
    # Broadcast via WebSocket (type 4 is system)
    handler = MessageHandler()
    handler.broadcast_group_message(group.id, sender.username, content, msg.message_id, msg_type=4)
    return msg



def api_bookmarks(request):
    """List bookmarked users: verified and unverified separately, with unread counts."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    bookmarks = Bookmark.objects.filter(user=user).select_related('bookmarked_user')

    # Get all read cursors for DMs
    cursors = {c.chat_id: c.last_read_at for c in ChatReadCursor.objects.filter(user=user, is_group=False)}
    
    verified = []
    for b in bookmarks.filter(is_verified=True):
        uname = b.bookmarked_user.username
        last_read = cursors.get(uname)
        if last_read:
            unread = Message.objects.filter(sender=b.bookmarked_user, recipient=user, timestamp__gt=last_read).count()
        else:
            unread = Message.objects.filter(sender=b.bookmarked_user, recipient=user).count()
            
        # Get latest message timestamp
        last_msg_at = Message.objects.filter(
            (Q(sender=user) & Q(recipient=b.bookmarked_user)) |
            (Q(sender=b.bookmarked_user) & Q(recipient=user))
        ).aggregate(Max('timestamp'))['timestamp__max']
        
        verified.append({
            'username': uname,
            'name': b.bookmarked_user.name or uname,
            'role': b.bookmarked_user.role,
            'is_verified': True,
            'unread_count': unread,
            'last_message_at': int(last_msg_at.timestamp() * 1000) if last_msg_at else 0
        })

    unverified = []
    for b in bookmarks.filter(is_verified=False):
        uname = b.bookmarked_user.username
        last_read = cursors.get(uname)
        if last_read:
            unread = Message.objects.filter(sender=b.bookmarked_user, recipient=user, timestamp__gt=last_read).count()
        else:
            unread = Message.objects.filter(sender=b.bookmarked_user, recipient=user).count()
            
        # Get latest message timestamp
        last_msg_at = Message.objects.filter(
            (Q(sender=user) & Q(recipient=b.bookmarked_user)) |
            (Q(sender=b.bookmarked_user) & Q(recipient=user))
        ).aggregate(Max('timestamp'))['timestamp__max']
        
        unverified.append({
            'username': uname,
            'name': b.bookmarked_user.name or uname,
            'role': b.bookmarked_user.role,
            'is_verified': False,
            'unread_count': unread,
            'last_message_at': int(last_msg_at.timestamp() * 1000) if last_msg_at else 0
        })

    return JsonResponse({'bookmarks': verified, 'unverified': unverified})


# 
@csrf_exempt
@require_POST
def api_bookmark_add(request):
    """Bookmark a user (verified)."""
    user = get_authenticated_user(request)
    print(user)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({'error': 'username required'}, status=400)
    try:
        target = User.objects.get(username=username)
        if target == user:
            return JsonResponse({'error': 'cannot bookmark yourself'}, status=400)
        bm, created = Bookmark.objects.get_or_create(
            user=user, bookmarked_user=target,
            defaults={'is_verified': True}
        )
        if not created and not bm.is_verified:
            bm.is_verified = True
            bm.save()
        return JsonResponse({'status': 'bookmarked', 'username': username})
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)



@csrf_exempt
@require_POST
def api_bookmark_remove(request):
    """Downgrade a bookmark to unverified (preserves chat history)."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({'error': 'username required'}, status=400)
    Bookmark.objects.filter(
        user=user, bookmarked_user__username=username, is_verified=True
    ).update(is_verified=False)
    return JsonResponse({'status': 'moved_to_unverified', 'username': username})



@csrf_exempt
@require_POST
def api_bookmark_verify(request):
    """Verify (accept) an unverified contact."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({'error': 'username required'}, status=400)
    updated = Bookmark.objects.filter(
        user=user, bookmarked_user__username=username, is_verified=False
    ).update(is_verified=True)
    if updated:
        return JsonResponse({'status': 'verified', 'username': username})
    return JsonResponse({'error': 'not found'}, status=404)



def api_all_users(request):
    """List users via server-side search with pagination."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
        
    query = request.GET.get('q', '').strip()
    try:
        page = int(request.GET.get('page', 1))
    except ValueError:
        page = 1
        
    limit = 20
    offset = (page - 1) * limit
    
    users_qs = User.objects.exclude(id=user.id).exclude(is_superuser=True)
    
    if query:
        users_qs = users_qs.filter(
            Q(username__icontains=query) | Q(name__icontains=query)
        )
    
    total_count = users_qs.count()
    users = users_qs.values('id', 'username', 'name', 'role')[offset:offset+limit]
    
    bookmarked = set(
        Bookmark.objects.filter(user=user).values_list('bookmarked_user__username', flat=True)
    )
    
    result = [{
        'username': u['username'],
        'name': u['name'] or u['username'],
        'role': u['role'],
        'is_bookmarked': u['username'] in bookmarked,
    } for u in users]
    
    return JsonResponse({
        'users': result,
        'total_count': total_count,
        'page': page,
        'has_more': offset + limit < total_count
    })



def api_groups(request):
    """List all groups the user is a member of, with unread counts."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    groups = ChatGroup.objects.filter(members=user)

    # Get all read cursors for groups
    cursors = {c.chat_id: c.last_read_at for c in ChatReadCursor.objects.filter(user=user, is_group=True)}

    result = []
    for g in groups:
        gid = str(g.id)
        last_read = cursors.get(gid)
        if last_read:
            unread = Message.objects.filter(group=g, timestamp__gt=last_read).exclude(sender=user).count()
        else:
            unread = Message.objects.filter(group=g).exclude(sender=user).count()
            
        # Get latest message timestamp
        last_msg_at = Message.objects.filter(group=g).aggregate(Max('timestamp'))['timestamp__max']
        
        result.append({
            'id': g.id,
            'name': g.name,
            'creator': g.creator.username if g.creator else '',
            'member_count': g.members.count(),
            'is_admin': g.admins.filter(id=user.id).exists(),
            'unread_count': unread,
            'last_message_at': int(last_msg_at.timestamp() * 1000) if last_msg_at else 0
        })

    return JsonResponse({'groups': result})



@csrf_exempt
@require_POST
def api_group_create(request):
    """Create a new chat group. Creator is auto-added as admin."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    name = data.get('name', '').strip()
    member_usernames = data.get('members', [])
    if not name:
        return JsonResponse({'error': 'group name required'}, status=400)

    group = ChatGroup.objects.create(name=name, creator=user)
    group.members.add(user)
    group.admins.add(user)  # Creator is admin by default

    for uname in member_usernames:
        try:
            target_user = User.objects.get(username=uname)
            group.members.add(target_user)
            # Notify members about the new group in real-time
            notify_user_refresh(uname)
        except User.DoesNotExist:
            pass

    create_system_message(group, f"Group '{name}' created by {user.username}")

    return JsonResponse({
        'status': 'created',
        'group': {
            'id': group.id,
            'name': group.name,
            'creator': group.creator.username,
            'member_count': group.members.count(),
            'is_admin': True,
        }
    })



@csrf_exempt
@require_POST
def api_group_add_member(request, group_id):
    """Add a member to a group (admin only). Prevents duplicates."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    username = data.get('username')
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=user.id).exists():
            return JsonResponse({'error': 'only admin can add members'}, status=403)
        target_user = User.objects.get(username=username)
        if group.members.filter(id=target_user.id).exists():
            return JsonResponse({'status': 'already_member', 'username': username})
        group.members.add(target_user)
        broadcast_group_refresh(group_id, reason='member_added')
        notify_user_refresh(username)
        create_system_message(group, f"{user.username} added {username}")
        return JsonResponse({'status': 'added', 'username': username})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)



@csrf_exempt
@require_POST
def api_group_remove_member(request, group_id):
    """Remove a member from a group (admin only)."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    username = data.get('username')
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=user.id).exists():
            return JsonResponse({'error': 'only admin can remove members'}, status=403)
        target_user = User.objects.get(username=username)
        if target_user == user:
            return JsonResponse({'error': 'use leave endpoint instead'}, status=400)
        group.members.remove(target_user)
        group.admins.remove(target_user)  # Also remove admin if they were one
        broadcast_group_refresh(group_id, reason='member_removed')
        notify_user_refresh(username)  # Tell them to refresh cause they are out
        create_system_message(group, f"{username} was removed from the group")
        return JsonResponse({'status': 'removed', 'username': username})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)



def api_group_members(request, group_id):
    """List members of a group."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    try:
        group = ChatGroup.objects.get(id=group_id, members=user)
        admin_ids = set(group.admins.values_list('id', flat=True))
        members = [{
            'username': m.username,
            'name': m.name or m.username,
            'role': m.role,
            'is_admin': m.id in admin_ids,
        } for m in group.members.all()]
        return JsonResponse({
            'group_name': group.name,
            'creator': group.creator.username if group.creator else '',
            'members': members,
            'is_admin': user.id in admin_ids,
        })
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)



@csrf_exempt
@require_POST
def api_group_leave(request, group_id):
    """Leave a group. Auto-assigns admin if last admin leaves. Deletes group if empty."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    try:
        group = ChatGroup.objects.get(id=group_id, members=user)
        is_admin = group.admins.filter(id=user.id).exists()

        # Remove from members and admins
        group.members.remove(user)
        group.admins.remove(user)

        remaining = group.members.count()

        if remaining == 0:
            # No members left — delete the group
            group.delete()
            return JsonResponse({'status': 'left', 'group_deleted': True})

        if is_admin and group.admins.count() == 0:
            # Last admin left — promote the first remaining member
            new_admin = group.members.first()
            if new_admin:
                group.admins.add(new_admin)

        broadcast_group_refresh(group_id, reason='member_left')
        create_system_message(group, f"{user.username} left the group")
        return JsonResponse({'status': 'left', 'group_deleted': False})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)



@csrf_exempt
@require_POST
def api_group_make_admin(request, group_id):
    """Promote a member to admin (admin only)."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    username = data.get('username')
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=user.id).exists():
            return JsonResponse({'error': 'only admin can promote'}, status=403)
        target_user = User.objects.get(username=username)
        if not group.members.filter(id=target_user.id).exists():
            return JsonResponse({'error': 'user is not a member'}, status=400)
        group.admins.add(target_user)
        create_system_message(group, f"{user.username} made {target_user.username} admin")
        return JsonResponse({'status': 'promoted', 'username': username})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)



def api_chat_history(request, chat_id):
    """Fetch last 50 messages (or paginated via offset) for a specific chat (group or DM)."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    is_group = request.GET.get('is_group') == 'true'
    
    # Parse pagination offset
    try:
        offset = int(request.GET.get('offset', 0))
    except ValueError:
        offset = 0
    
    from .models import Message
    from django.db.models import Q
    
    if is_group:
        try:
            group = ChatGroup.objects.get(id=chat_id)
            if not group.members.filter(id=user.id).exists():
                return JsonResponse({'error': 'not a member'}, status=403)
            messages = Message.objects.filter(group=group)
        except ChatGroup.DoesNotExist:
            return JsonResponse({'error': 'group not found'}, status=404)
    else:
        messages = Message.objects.filter(
            (Q(sender=user) & Q(recipient__username=chat_id)) |
            (Q(sender__username=chat_id) & Q(recipient=user))
        )

    # Check license for LAZYLOADING module
    from chat.services.licensing import LicensingService
    license_info = LicensingService.get_license_info()
    has_lazyloading = False
    if license_info and "error" not in license_info and "MODULES" in license_info:
        modules = license_info.get("MODULES", "")
        if "LAZYLOADING" in modules:
            has_lazyloading = True

    # Enforce limit if not licensed
    limit = 12
    if not has_lazyloading:
        offset = 0
        limit = 50

    history = messages.order_by('-timestamp').prefetch_related('attachments')[offset:offset+limit]
    data = []
    for msg in reversed(history):
        # Compute is_expired dynamically
        from django.utils import timezone
        now = timezone.now()
        expired = msg.is_expired or (msg.expires_at is not None and now >= msg.expires_at)
        
        # Auto-scrub expired messages on access (lazy cleanup)
        if expired and not msg.is_expired:
            msg.content = "Msg time expires"
            msg.is_expired = True
            msg.save(update_fields=['content', 'is_expired'])
            # Delete attachment files from disk
            for att in msg.attachments.all():
                if not att.is_expired:
                    if att.file:
                        try:
                            att.file.delete(save=False)
                        except Exception:
                            pass
                    att.file_name = "Msg time expires"
                    att.file_type = "expired"
                    att.is_expired = True
                    att.save()
        
        msg_dict = {
            'messageId': msg.message_id,
            'senderId': msg.sender.username,
            'targetId': chat_id,
            'isGroupMessage': is_group,
            'type': msg.message_type,
            'payload': msg.decrypted_content.encode('utf-8').hex() if not expired else '',
            'sentAt': int(msg.timestamp.timestamp() * 1000),
            'expires_at': int(msg.expires_at.timestamp() * 1000) if msg.expires_at else None,
            'is_expired': expired,
        }
        
        # Only attach attachment data if message is NOT expired
        if not expired:
            att = msg.attachments.first()
            if att:
                msg_dict['attachment'] = {
                    'id': str(att.id),
                    'name': att.decrypted_file_name,
                    'type': att.decrypted_file_type,
                    'url': att.file.url if att.file else '',
                    'size': att.file_size,
                }
        data.append(msg_dict)
        
    return JsonResponse({'messages': data})



@csrf_exempt
@require_POST
def api_group_rename(request, group_id):
    """Rename a group (admin only)."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    name = data.get('name', '').strip()
    if not name:
        return JsonResponse({'error': 'name required'}, status=400)
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=user.id).exists():
            return JsonResponse({'error': 'only admin can rename'}, status=403)
        group.name = name
        group.save()
        broadcast_group_refresh(group_id, reason='renamed')
        return JsonResponse({'status': 'renamed', 'name': name})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)



def api_export_messages(request, chat_id):
    """Export messages for a chat as a downloadable .txt file within a date range."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    from .models import Message
    from django.db.models import Q
    from django.http import HttpResponse
    from datetime import datetime, timezone

    is_group = request.GET.get('is_group') == 'true'
    date_from = request.GET.get('from', '')
    date_to = request.GET.get('to', '')
    include_attachments = request.GET.get('include_attachments') == 'true'

    # Parse dates
    try:
        start = datetime.strptime(date_from, '%Y-%m-%d').replace(tzinfo=timezone.utc) if date_from else None
    except ValueError:
        return JsonResponse({'error': 'Invalid from date'}, status=400)
    try:
        end = datetime.strptime(date_to, '%Y-%m-%d').replace(hour=23, minute=59, second=59, tzinfo=timezone.utc) if date_to else None
    except ValueError:
        return JsonResponse({'error': 'Invalid to date'}, status=400)

    if is_group:
        try:
            group = ChatGroup.objects.get(id=chat_id)
            if not group.members.filter(id=user.id).exists():
                return JsonResponse({'error': 'not a member'}, status=403)
            messages = Message.objects.filter(group=group)
            chat_label = f"Group: {group.name}"
        except ChatGroup.DoesNotExist:
            return JsonResponse({'error': 'group not found'}, status=404)
    else:
        messages = Message.objects.filter(
            (Q(sender=user) & Q(recipient__username=chat_id)) |
            (Q(sender__username=chat_id) & Q(recipient=user))
        )
        chat_label = f"DM: {user.username} ↔ {chat_id}"

    if start:
        messages = messages.filter(timestamp__gte=start)
    if end:
        messages = messages.filter(timestamp__lte=end)

    if include_attachments:
        messages = messages.prefetch_related('attachments')

    messages = messages.order_by('timestamp')

    format_type = request.GET.get('format', 'text')
    if format_type == 'json':
        data = []
        for msg in messages:
            msg_dict = {
                'messageId': msg.message_id,
                'senderId': msg.sender.username,
                'targetId': chat_id,
                'isGroupMessage': is_group,
                'type': msg.message_type,
                'payload': msg.decrypted_content.encode('utf-8').hex(),
                'sentAt': int(msg.timestamp.timestamp() * 1000)
            }
            if include_attachments:
                att = msg.attachments.first()
                if att:
                    msg_dict['attachment'] = {
                        'id': str(att.id),
                        'name': att.decrypted_file_name,
                        'type': att.decrypted_file_type,
                        'url': att.file.url,
                        'size': att.file_size,
                    }
            data.append(msg_dict)
        return JsonResponse({'messages': data, 'chat_label': chat_label})

    # Build text content
    lines = []
    lines.append(f"═══════════════════════════════════════")
    lines.append(f"  CHAT EXPORT — {chat_label}")
    lines.append(f"  Exported by: {user.username}")
    if start or end:
        range_str = f"{date_from or 'beginning'} → {date_to or 'now'}"
        lines.append(f"  Date Range: {range_str}")
    lines.append(f"  Include Attachments: {'Yes' if include_attachments else 'No'}")
    lines.append(f"  Total Messages: {messages.count()}")
    lines.append(f"═══════════════════════════════════════")
    lines.append("")

    for msg in messages:
        ts = msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        line = f"[{ts}] {msg.sender.username}: {msg.decrypted_content}"
        
        if include_attachments:
            for att in msg.attachments.all():
                url = request.build_absolute_uri(att.file.url)
                line += f" [Attachment: {att.file_name} ({url})]"
        
        lines.append(line)

    lines.append("")
    lines.append(f"═══ END OF EXPORT ═══")

    content = '\n'.join(lines)
    base_filename = f"chat_export_{chat_id}_{date_from or 'all'}_{date_to or 'now'}"

    if include_attachments:
        import zipfile
        import io
        from django.core.files.storage import default_storage

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            # Add text log
            zip_file.writestr(f"{base_filename}.txt", content)
            
            # Add attachments
            added_files = set()
            for msg in messages:
                for att in msg.attachments.all():
                    if att.file and att.file.name not in added_files:
                        try:
                            file_content = att.file.read()
                            # Use the filename from the path to avoid conflicts, or just use uuid name
                            zip_file.writestr(f"attachments/{os.path.basename(att.file.name)}", file_content)
                            added_files.add(att.file.name)
                            # Reset file pointer for potential future reads in the same request (though unlikely)
                            att.file.seek(0)
                        except Exception as e:
                            print(f"Error adding file {att.file.name} to zip: {e}")

        buffer.seek(0)
        response = HttpResponse(buffer.read(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="{base_filename}.zip"'
        return response

    # Default .txt response
    response = HttpResponse(content, content_type='text/plain; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{base_filename}.txt"'
    return response



@csrf_exempt
@require_POST
def api_set_status(request):
    """Set the user's activity status and broadcast to contacts."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    from .models import UserStatus
    data = json.loads(request.body)
    status = data.get('status', 0)
    if status not in [0, 1, 2, 3]:
        return JsonResponse({'error': 'invalid status'}, status=400)

    obj, _ = UserStatus.objects.update_or_create(
        user=user,
        defaults={'status': status}
    )

    # Broadcast to all contacts via channel layer
    channel_layer = get_channel_layer()
    bookmarks = Bookmark.objects.filter(
        bookmarked_user=user
    ).select_related('user')
    for bm in bookmarks:
        async_to_sync(channel_layer.group_send)(
            f'user_{bm.user.username}',
            {
                'type': 'presence.update',
                'user_id': user.username,
                'status': status,
                'is_online': True,
            }
        )

    return JsonResponse({'status': 'ok', 'value': status})



def api_get_statuses(request):
    """Get activity statuses for all the user's contacts."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    from .models import UserStatus
    # Get all bookmarked users
    bookmarked_users = Bookmark.objects.filter(
        user=user
    ).values_list('bookmarked_user__username', flat=True)

    statuses = {}
    for us in UserStatus.objects.filter(user__username__in=bookmarked_users):
        statuses[us.user.username] = {
            'status': us.status,
            'is_online': us.is_online
        }

    # Also include the user's own status
    try:
        own = UserStatus.objects.get(user=user)
        statuses[user.username] = {
            'status': own.status,
            'is_online': own.is_online
        }
    except UserStatus.DoesNotExist:
        statuses[user.username] = {'status': 0, 'is_online': False}

    return JsonResponse({'statuses': statuses})


@csrf_exempt
@require_POST
def api_mark_read(request):
    """Update the read cursor for a chat (DM or group)."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    data = json.loads(request.body)
    chat_id = data.get('chat_id', '').strip()
    is_group = data.get('is_group', False)
    if not chat_id:
        return JsonResponse({'error': 'chat_id required'}, status=400)

    from django.utils import timezone
    ChatReadCursor.objects.update_or_create(
        user=user,
        chat_id=chat_id,
        is_group=is_group,
        defaults={'last_read_at': timezone.now()}
    )
    return JsonResponse({'status': 'ok'})


@csrf_exempt
@require_POST
def api_upload_attachment(request):
    """Upload a file and return its metadata."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    
    if 'file' not in request.FILES:
        return JsonResponse({'error': 'no file provided'}, status=400)
    
    uploaded_file = request.FILES['file']
    
    # We don't link to a message yet because the message hasn't been created.
    # The frontend will upload the file first, get the details, and then send the message with attachment metadata.
    # However, our MessageAttachment model requires a message.
    # Change of plan: We'll store the file temporarily or just update the model to allow null message initially?
    # Better: Use a separate TemporaryAttachment model or just save the file and return a path.
    # Let's keep it simple: Save the file, return details, and we'll create the MessageAttachment when saving the message.
    
    import os
    from django.core.files.storage import default_storage
    from django.core.files.base import ContentFile
    
    # Generate a unique path
    import uuid
    ext = os.path.splitext(uploaded_file.name)[1]
    filename = f"{uuid.uuid4()}{ext}"
    path = f"chat_attachments/{filename}"
    
    actual_path = default_storage.save(path, ContentFile(uploaded_file.read()))
    url = default_storage.url(actual_path)
    
    return JsonResponse({
        'id': filename,
        'name': uploaded_file.name,
        'type': uploaded_file.content_type,
        'size': uploaded_file.size,
        'url': url
    })


@csrf_exempt
@require_POST
def api_register(request):
    """Register a new user with default credentials."""
    data = json.loads(request.body)
    username = data.get('username')
    name = data.get('name')
    role = data.get('role')

    if not username or not name or not role:
        return JsonResponse({'error': 'all fields required'}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'username already exists'}, status=400)

    try:
        user = User.objects.create_user(
            username=username,
            name=name,
            role=role,
            password='Test@123',
            email='Test@gmail.com'
        )
        from .models import UserStatus
        UserStatus.objects.get_or_create(user=user, defaults={'status': 0})
        return JsonResponse({'status': 'created', 'username': username})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
def api_mute_settings(request):
    """Get or update the user's notification mute setting."""
    user = get_authenticated_user(request)
    if not user:
        return JsonResponse({'error': 'unauthorized'}, status=401)
    
    if request.method == 'GET':
        return JsonResponse({'is_muted': getattr(user, 'is_muted', True)})
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            # Default to True if not provided
            is_muted = data.get('is_muted', True)
            user.is_muted = is_muted
            user.save()
            return JsonResponse({'status': 'success', 'is_muted': user.is_muted})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)
    
    return JsonResponse({'error': 'method not allowed'}, status=405)
