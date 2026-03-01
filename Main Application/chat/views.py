import json
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.views.decorators.http import require_POST
from .models import Bookmark, ChatGroup
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

User = get_user_model()


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


@login_required
def api_bookmarks(request):
    """List bookmarked users: verified and unverified separately."""
    bookmarks = Bookmark.objects.filter(user=request.user).select_related('bookmarked_user')
    verified = [{
        'username': b.bookmarked_user.username,
        'name': b.bookmarked_user.name or b.bookmarked_user.username,
        'role': b.bookmarked_user.role,
        'is_verified': True,
    } for b in bookmarks.filter(is_verified=True)]
    unverified = [{
        'username': b.bookmarked_user.username,
        'name': b.bookmarked_user.name or b.bookmarked_user.username,
        'role': b.bookmarked_user.role,
        'is_verified': False,
    } for b in bookmarks.filter(is_verified=False)]
    return JsonResponse({'bookmarks': verified, 'unverified': unverified})


@login_required
@require_POST
def api_bookmark_add(request):
    """Bookmark a user (verified)."""
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({'error': 'username required'}, status=400)
    try:
        target = User.objects.get(username=username)
        if target == request.user:
            return JsonResponse({'error': 'cannot bookmark yourself'}, status=400)
        bm, created = Bookmark.objects.get_or_create(
            user=request.user, bookmarked_user=target,
            defaults={'is_verified': True}
        )
        if not created and not bm.is_verified:
            bm.is_verified = True
            bm.save()
        return JsonResponse({'status': 'bookmarked', 'username': username})
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)


@login_required
@require_POST
def api_bookmark_remove(request):
    """Downgrade a bookmark to unverified (preserves chat history)."""
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({'error': 'username required'}, status=400)
    Bookmark.objects.filter(
        user=request.user, bookmarked_user__username=username, is_verified=True
    ).update(is_verified=False)
    return JsonResponse({'status': 'moved_to_unverified', 'username': username})


@login_required
@require_POST
def api_bookmark_verify(request):
    """Verify (accept) an unverified contact."""
    data = json.loads(request.body)
    username = data.get('username')
    if not username:
        return JsonResponse({'error': 'username required'}, status=400)
    updated = Bookmark.objects.filter(
        user=request.user, bookmarked_user__username=username, is_verified=False
    ).update(is_verified=True)
    if updated:
        return JsonResponse({'status': 'verified', 'username': username})
    return JsonResponse({'error': 'not found'}, status=404)


@login_required
def api_all_users(request):
    """List all users except the current one."""
    users = User.objects.exclude(id=request.user.id).exclude(is_superuser=True).values('id', 'username', 'name', 'role')
    bookmarked = set(
        Bookmark.objects.filter(user=request.user).values_list('bookmarked_user__username', flat=True)
    )
    result = [{
        'username': u['username'],
        'name': u['name'] or u['username'],
        'role': u['role'],
        'is_bookmarked': u['username'] in bookmarked,
    } for u in users]
    return JsonResponse({'users': result})


@login_required
def api_groups(request):
    """List all groups the user is a member of."""
    groups = ChatGroup.objects.filter(members=request.user)
    result = [{
        'id': g.id,
        'name': g.name,
        'creator': g.creator.username if g.creator else '',
        'member_count': g.members.count(),
        'is_admin': g.admins.filter(id=request.user.id).exists(),
    } for g in groups]
    return JsonResponse({'groups': result})


@login_required
@require_POST
def api_group_create(request):
    """Create a new chat group. Creator is auto-added as admin."""
    data = json.loads(request.body)
    name = data.get('name', '').strip()
    member_usernames = data.get('members', [])
    if not name:
        return JsonResponse({'error': 'group name required'}, status=400)

    group = ChatGroup.objects.create(name=name, creator=request.user)
    group.members.add(request.user)
    group.admins.add(request.user)  # Creator is admin by default

    for uname in member_usernames:
        try:
            user = User.objects.get(username=uname)
            group.members.add(user)
        except User.DoesNotExist:
            pass

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


@login_required
@require_POST
def api_group_add_member(request, group_id):
    """Add a member to a group (admin only). Prevents duplicates."""
    data = json.loads(request.body)
    username = data.get('username')
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=request.user.id).exists():
            return JsonResponse({'error': 'only admin can add members'}, status=403)
        user = User.objects.get(username=username)
        if group.members.filter(id=user.id).exists():
            return JsonResponse({'status': 'already_member', 'username': username})
        group.members.add(user)
        broadcast_group_refresh(group_id, reason='member_added')
        notify_user_refresh(username)
        return JsonResponse({'status': 'added', 'username': username})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)


@login_required
@require_POST
def api_group_remove_member(request, group_id):
    """Remove a member from a group (admin only)."""
    data = json.loads(request.body)
    username = data.get('username')
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=request.user.id).exists():
            return JsonResponse({'error': 'only admin can remove members'}, status=403)
        user = User.objects.get(username=username)
        if user == request.user:
            return JsonResponse({'error': 'use leave endpoint instead'}, status=400)
        group.members.remove(user)
        group.admins.remove(user)  # Also remove admin if they were one
        broadcast_group_refresh(group_id, reason='member_removed')
        notify_user_refresh(username)  # Tell them to refresh cause they are out
        return JsonResponse({'status': 'removed', 'username': username})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)


@login_required
def api_group_members(request, group_id):
    """List members of a group."""
    try:
        group = ChatGroup.objects.get(id=group_id, members=request.user)
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
            'is_admin': request.user.id in admin_ids,
        })
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)


@login_required
@require_POST
def api_group_leave(request, group_id):
    """Leave a group. Auto-assigns admin if last admin leaves. Deletes group if empty."""
    try:
        group = ChatGroup.objects.get(id=group_id, members=request.user)
        is_admin = group.admins.filter(id=request.user.id).exists()

        # Remove from members and admins
        group.members.remove(request.user)
        group.admins.remove(request.user)

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
        return JsonResponse({'status': 'left', 'group_deleted': False})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)


@login_required
@require_POST
def api_group_make_admin(request, group_id):
    """Promote a member to admin (admin only)."""
    data = json.loads(request.body)
    username = data.get('username')
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=request.user.id).exists():
            return JsonResponse({'error': 'only admin can promote'}, status=403)
        user = User.objects.get(username=username)
        if not group.members.filter(id=user.id).exists():
            return JsonResponse({'error': 'user is not a member'}, status=400)
        group.admins.add(user)
        return JsonResponse({'status': 'promoted', 'username': username})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)
    except User.DoesNotExist:
        return JsonResponse({'error': 'user not found'}, status=404)


@login_required
def api_chat_history(request, chat_id):
    """Fetch last 50 messages for a specific chat (group or DM)."""
    is_group = request.GET.get('is_group') == 'true'
    
    from .models import Message
    from django.db.models import Q
    
    if is_group:
        try:
            group = ChatGroup.objects.get(id=chat_id)
            if not group.members.filter(id=request.user.id).exists():
                return JsonResponse({'error': 'not a member'}, status=403)
            messages = Message.objects.filter(group=group)
        except ChatGroup.DoesNotExist:
            return JsonResponse({'error': 'group not found'}, status=404)
    else:
        messages = Message.objects.filter(
            (Q(sender=request.user) & Q(recipient__username=chat_id)) |
            (Q(sender__username=chat_id) & Q(recipient=request.user))
        )

    history = messages.order_by('-timestamp')[:50]
    data = []
    for msg in reversed(history):
        data.append({
            'messageId': f"db_{msg.id}",
            'senderId': msg.sender.username,
            'targetId': chat_id,
            'isGroupMessage': is_group,
            'type': 0,
            'payload': msg.content.encode('utf-8').hex(),
            'sentAt': int(msg.timestamp.timestamp() * 1000)
        })
        
    return JsonResponse({'messages': data})


@login_required
@require_POST
def api_group_rename(request, group_id):
    """Rename a group (admin only)."""
    data = json.loads(request.body)
    name = data.get('name', '').strip()
    if not name:
        return JsonResponse({'error': 'name required'}, status=400)
    try:
        group = ChatGroup.objects.get(id=group_id)
        if not group.admins.filter(id=request.user.id).exists():
            return JsonResponse({'error': 'only admin can rename'}, status=403)
        group.name = name
        group.save()
        broadcast_group_refresh(group_id, reason='renamed')
        return JsonResponse({'status': 'renamed', 'name': name})
    except ChatGroup.DoesNotExist:
        return JsonResponse({'error': 'group not found'}, status=404)


@login_required
def api_export_messages(request, chat_id):
    """Export messages for a chat as a downloadable .txt file within a date range."""
    from .models import Message
    from django.db.models import Q
    from django.http import HttpResponse
    from datetime import datetime, timezone

    is_group = request.GET.get('is_group') == 'true'
    date_from = request.GET.get('from', '')
    date_to = request.GET.get('to', '')

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
            if not group.members.filter(id=request.user.id).exists():
                return JsonResponse({'error': 'not a member'}, status=403)
            messages = Message.objects.filter(group=group)
            chat_label = f"Group: {group.name}"
        except ChatGroup.DoesNotExist:
            return JsonResponse({'error': 'group not found'}, status=404)
    else:
        messages = Message.objects.filter(
            (Q(sender=request.user) & Q(recipient__username=chat_id)) |
            (Q(sender__username=chat_id) & Q(recipient=request.user))
        )
        chat_label = f"DM: {request.user.username} ↔ {chat_id}"

    if start:
        messages = messages.filter(timestamp__gte=start)
    if end:
        messages = messages.filter(timestamp__lte=end)

    messages = messages.order_by('timestamp')

    # Build text content
    lines = []
    lines.append(f"═══════════════════════════════════════")
    lines.append(f"  CHAT EXPORT — {chat_label}")
    lines.append(f"  Exported by: {request.user.username}")
    if start or end:
        range_str = f"{date_from or 'beginning'} → {date_to or 'now'}"
        lines.append(f"  Date Range: {range_str}")
    lines.append(f"  Total Messages: {messages.count()}")
    lines.append(f"═══════════════════════════════════════")
    lines.append("")

    for msg in messages:
        ts = msg.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        lines.append(f"[{ts}] {msg.sender.username}: {msg.content}")

    lines.append("")
    lines.append(f"═══ END OF EXPORT ═══")

    content = '\n'.join(lines)
    filename = f"chat_export_{chat_id}_{date_from or 'all'}_{date_to or 'now'}.txt"

    response = HttpResponse(content, content_type='text/plain; charset=utf-8')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response


@login_required
@require_POST
def api_set_status(request):
    """Set the user's activity status and broadcast to contacts."""
    from .models import UserStatus
    data = json.loads(request.body)
    status = data.get('status', 0)
    if status not in [0, 1, 2, 3]:
        return JsonResponse({'error': 'invalid status'}, status=400)

    obj, _ = UserStatus.objects.update_or_create(
        user=request.user,
        defaults={'status': status}
    )

    # Broadcast to all contacts via channel layer
    channel_layer = get_channel_layer()
    bookmarks = Bookmark.objects.filter(
        bookmarked_user=request.user
    ).select_related('user')
    for bm in bookmarks:
        async_to_sync(channel_layer.group_send)(
            f'user_{bm.user.username}',
            {
                'type': 'presence.update',
                'user_id': request.user.username,
                'status': status,
            }
        )

    return JsonResponse({'status': 'ok', 'value': status})


@login_required
def api_get_statuses(request):
    """Get activity statuses for all the user's contacts."""
    from .models import UserStatus
    # Get all bookmarked users
    bookmarked_users = Bookmark.objects.filter(
        user=request.user
    ).values_list('bookmarked_user__username', flat=True)

    statuses = {}
    for us in UserStatus.objects.filter(user__username__in=bookmarked_users):
        statuses[us.user.username] = us.status

    # Also include the user's own status
    try:
        own = UserStatus.objects.get(user=request.user)
        statuses[request.user.username] = own.status
    except UserStatus.DoesNotExist:
        statuses[request.user.username] = 0

    return JsonResponse({'statuses': statuses})
