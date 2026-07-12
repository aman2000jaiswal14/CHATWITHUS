import os
import re
import json
from django.conf import settings

class DocumentSecurityManager:
    @staticmethod
    def load_rules():
        default_rules = [
            {"pattern": "secret_.*", "allowed_roles": ["Admin", "Commander"]},
            {"pattern": "confidential_.*", "allowed_roles": ["Staff", "Admin", "Commander"]},
            {"pattern": ".*", "allowed_roles": ["*"]}
        ]
        
        folder = getattr(settings, 'AI_DOC_FOLDER', '')
        if not folder:
            return default_rules
            
        config_path = os.path.join(folder, 'classification.json')
        if not os.path.exists(config_path):
            return default_rules
            
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('rules', default_rules)
        except Exception:
            return default_rules

    @classmethod
    def is_file_permitted(cls, filename, user_role):
        """
        Checks if the given user_role is explicitly allowed to access filename
        based on the rules defined in classification.json.
        """
        rules = cls.load_rules()
        for rule in rules:
            pattern = rule.get('pattern', '')
            allowed_roles = rule.get('allowed_roles', [])
            
            # Use regex match
            try:
                if re.match(pattern, filename, re.IGNORECASE):
                    # Check if user_role matches any in the list of allowed_roles (case-insensitive)
                    if allowed_roles == "*" or allowed_roles == ["*"]:
                        return True
                    if isinstance(allowed_roles, list):
                        allowed_roles_lower = [str(r).lower() for r in allowed_roles]
                        if "*" in allowed_roles_lower:
                            return True
                        if user_role and user_role.lower() in allowed_roles_lower:
                            return True
                    return False
            except Exception:
                continue
                
        # Safe default if no rule matches
        return False

    @classmethod
    def get_permitted_files(cls, user):
        """
        Scans AI_DOC_FOLDER and returns a list of files the user has permission to access.
        """
        folder = getattr(settings, 'AI_DOC_FOLDER', '')
        if not folder or not os.path.exists(folder):
            return []
            
        permitted = []
        user_role = getattr(user, 'role', 'User') or 'User'
        
        try:
            for item in os.listdir(folder):
                item_path = os.path.join(folder, item)
                if os.path.isfile(item_path) and item != 'classification.json':
                    if cls.is_file_permitted(item, user_role):
                        permitted.append(item_path)
        except Exception:
            pass
            
        return permitted
