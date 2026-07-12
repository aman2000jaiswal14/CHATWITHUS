import os
import re
from django.conf import settings

class LocalQAEngine:
    STOP_WORDS = {
        'the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'to', 'in', 'of', 'for', 'with', 
        'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 
        'above', 'below', 'from', 'up', 'down', 'in', 'out', 'off', 'over', 'under', 
        'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 
        'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 
        'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 
        's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'what', 'who', 'this',
        'that', 'these', 'those', 'are', 'was', 'were', 'be', 'been', 'being', 'have',
        'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'but', 'if', 'or', 'because',
        'as', 'until', 'while', 'please', 'you', 'me', 'my', 'your', 'i', 'we', 'they', 'he', 'she'
    }

    @classmethod
    def clean_text(cls, text):
        """Converts to lowercase and cleans punctuation."""
        return re.sub(r'[^\w\s]', ' ', text.lower())

    @classmethod
    def extract_keywords(cls, query):
        """Extracts unique non-stopword keywords from query."""
        words = cls.clean_text(query).split()
        return [w for w in words if w not in cls.STOP_WORDS and len(w) > 1]

    @classmethod
    def read_file_safe(cls, file_path, max_bytes=512000):
        """Safely reads file contents up to max_bytes with encoding fallback."""
        if not os.path.exists(file_path):
            return ""
            
        try:
            # Enforce size limit
            if os.path.getsize(file_path) > 5242880:  # 5MB limit
                return "[Error: File too large]"
                
            with open(file_path, 'rb') as f:
                content_bytes = f.read(max_bytes)
                
            # Try decoding
            for encoding in ['utf-8', 'latin-1', 'cp1252']:
                try:
                    return content_bytes.decode(encoding)
                except UnicodeDecodeError:
                    continue
            return ""
        except Exception:
            return ""

    @classmethod
    def search_documents(cls, query, file_paths):
        """
        Scans permitted files for matching sentences/paragraphs.
        Returns a list of tuples: (filename, matched_snippet, score)
        """
        keywords = cls.extract_keywords(query)
        if not keywords:
            return []

        matches = []
        for path in file_paths:
            filename = os.path.basename(path)
            content = cls.read_file_safe(path)
            if not content or content.startswith("[Error:"):
                continue

            # Split content into paragraphs or sentences
            segments = re.split(r'\n\n+|\.\s+', content)
            for segment in segments:
                segment_clean = segment.strip()
                if not segment_clean or len(segment_clean) < 10:
                    continue

                segment_lower = segment_clean.lower()
                score = 0
                matched_words = 0

                for kw in keywords:
                    count = segment_lower.count(kw)
                    if count > 0:
                        score += count * 2
                        matched_words += 1

                if score > 0:
                    # Boost score if multiple unique keywords matched
                    score += matched_words * 5
                    # Boost score for exact phrase match if query has multiple words
                    query_clean = cls.clean_text(query)
                    if len(keywords) > 1 and query_clean in segment_lower:
                        score += 20
                        
                    matches.append((filename, segment_clean, score))

        # Sort matches by score descending
        matches.sort(key=lambda x: x[2], reverse=True)
        return matches

    @classmethod
    def get_conversational_response(cls, query):
        """Returns standard friendly replies for conversational queries."""
        q = cls.clean_text(query).strip()
        
        # Simple match patterns
        if any(greet in q for greet in ['hello', 'hi', 'hey', 'greetings', 'hola']):
            return ("Hello! I am the AI Assistant. I can help you analyze documents and answer "
                    "your questions securely. Send me a question or upload a file for analysis.")
                    
        if any(identity in q for identity in ['who are you', 'your name', 'what are you']):
            return ("I am the ChatWithUs AI Assistant. I am a secure, local, and air-gapped assistant "
                    "integrated directly into this system to protect your data privacy.")

        if any(feat in q for feat in ['what can you do', 'features', 'help', 'capabilities']):
            return ("Here is what I can do:\n"
                    "1. **Analyze Local Documents**: I can search and retrieve information from security-cleared "
                    "documents in the `AI_DOC_TO_READ_AND_ANALYSE` directory.\n"
                    "2. **Process Attachments**: Upload a text/markdown file, and I will extract and analyze its "
                    "contents securely.\n"
                    "3. **E2EE Messaging**: All messages between us are fully encrypted end-to-end (E2EE) "
                    "using ECDH P-256 key exchange.")

        return None

    @classmethod
    def answer_query(cls, query, permitted_files, attachment_content=None, attachment_name=None):
        """
        Coordinates parsing, document search, and response construction.
        """
        # 1. Check conversational responses
        conv = cls.get_conversational_response(query)
        if conv:
            return conv

        # 2. Setup virtual files list including attachment
        matches = []
        
        # Parse attachment content if present
        if attachment_content:
            keywords = cls.extract_keywords(query)
            if keywords:
                segments = re.split(r'\n\n+|\.\s+', attachment_content)
                for segment in segments:
                    segment_clean = segment.strip()
                    if not segment_clean or len(segment_clean) < 10:
                        continue
                    segment_lower = segment_clean.lower()
                    score = 0
                    matched_words = 0
                    for kw in keywords:
                        count = segment_lower.count(kw)
                        if count > 0:
                            score += count * 2
                            matched_words += 1
                    if score > 0:
                        score += matched_words * 5
                        query_clean = cls.clean_text(query)
                        if len(keywords) > 1 and query_clean in segment_lower:
                            score += 20
                        matches.append((attachment_name or "Uploaded Document", segment_clean, score))

        # 3. Search local system documents
        doc_matches = cls.search_documents(query, permitted_files)
        matches.extend(doc_matches)

        # Sort combined matches
        matches.sort(key=lambda x: x[2], reverse=True)

        if not matches:
            return ("I scanned the available local documents and attachments, but I couldn't "
                    "find any information matching your query. Please check your role clearance "
                    "or make sure your query contains relevant keywords.")

        # Construct a natural language response
        response = "Based on the secure documents available, here is what I found:\n\n"
        seen_snippets = set()
        count = 0
        
        for filename, snippet, score in matches:
            if snippet in seen_snippets:
                continue
            seen_snippets.add(snippet)
            
            # Ensure the snippet ends with proper punctuation
            if not snippet.endswith('.') and not snippet.endswith('!') and not snippet.endswith('?'):
                snippet += '.'
                
            response += f"According to *{filename}*: {snippet}\n\n"
            count += 1
            if count >= 3:
                break
                
        return response.strip()

import requests
import json

class OllamaLLMEngine:
    @classmethod
    def answer_query(cls, query, permitted_files, attachment_content=None, attachment_name=None, chat_history=None):
        context_parts = []
        
        # 1. Provide an index of available documents so the LLM can answer "what documents do you have?"
        doc_names = [os.path.basename(f) for f in permitted_files]
        if doc_names:
            context_parts.append(f"--- Document Index ---\nThe following secure files are available in the system: {', '.join(doc_names)}\n")
        
        # 2. Extract keywords and retrieve top relevant snippets to prevent context overflow
        from .llm import LocalQAEngine # Ensure we can access the heuristic search
        matches = []
        
        # Parse attachment content if present
        if attachment_content:
            keywords = LocalQAEngine.extract_keywords(query)
            if keywords:
                segments = re.split(r'\n\n+|\.\s+', attachment_content)
                for segment in segments:
                    segment_clean = segment.strip()
                    if not segment_clean or len(segment_clean) < 10:
                        continue
                    segment_lower = segment_clean.lower()
                    score = 0
                    matched_words = 0
                    for kw in keywords:
                        count = segment_lower.count(kw)
                        if count > 0:
                            score += count * 2
                            matched_words += 1
                    if score > 0:
                        score += matched_words * 5
                        if len(keywords) > 1 and LocalQAEngine.clean_text(query) in segment_lower:
                            score += 20
                        matches.append((attachment_name or "Uploaded Document", segment_clean, score))
            else:
                # If no keywords (or conversational), just include the first chunk of the attachment
                matches.append((attachment_name or "Uploaded Document", attachment_content[:2000], 10))

        # Search the local file system
        doc_matches = LocalQAEngine.search_documents(query, permitted_files)
        matches.extend(doc_matches)
        
        # Sort combined matches and take the top 15 most relevant snippets
        matches.sort(key=lambda x: x[2], reverse=True)
        top_matches = matches[:15]
        
        if top_matches:
            context_parts.append("--- Relevant Document Snippets ---")
            for filename, snippet, score in top_matches:
                context_parts.append(f"[From {filename}]: {snippet}")
                
        context_text = "\n".join(context_parts)
        
        history_text = ""
        if chat_history:
            history_text = "\nPREVIOUS CONVERSATION CONTEXT:\n" + "\n".join(chat_history) + "\n"
        
        prompt = f"""You are an advanced AI assistant in an end-to-end encrypted messaging application.
Your goal is to answer the user's query based ONLY on the provided context documents below. 
IMPORTANT: You DO have access to documents! They are provided to you right below this instruction under "CONTEXT DOCUMENTS". 
If the answer is not contained in the context documents or the previous conversation context, you MUST state that you do not know. DO NOT invent or hallucinate information. You must base your answer STRICTLY on the provided documents.
If the user asks what documents are available or present, you MUST read the titles from the "CONTEXT DOCUMENTS" and list them for the user.
Format your answer naturally, using *bold* and _italics_ where appropriate. When listing items (like documents), always use bullet points and place each item on a new line. Do not use blockquotes or complex markdown that might not render properly.
{history_text}
CONTEXT DOCUMENTS:
{context_text}

USER QUERY:
{query}

ANSWER:
"""
        try:
            response = requests.post(
                getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434/api/generate'),
                json={
                    "model": getattr(settings, 'OLLAMA_MODEL', 'qwen2.5-coder:1.5b'),
                    "prompt": prompt,
                    "stream": False
                },
                timeout=getattr(settings, 'OLLAMA_TIMEOUT', 30)
            )
            response.raise_for_status()
            data = response.json()
            return data.get("response", "I could not generate an answer.")
        except Exception as e:
            return f"An error occurred while communicating with the advanced AI engine: {str(e)}"
