# Module 6: Rich Markdown Rendering (MARKDOWN)

## Overview
The Markdown module enables rich text formatting within the chat interface, allowing users to communicate with professional layout and clarity.

## Features
- **Text Styling**: Bold, italics, strikethrough, and underlined text.
- **Structural Elements**: Bulleted/numbered lists, blockquotes, and headers.
- **Code Blocks**: Inline code and syntax-highlighted code blocks for technical exchange.
- **Links**: Secure, sanitised hyperlink support.

## Licensing Enforcement
- **Module ID**: `MARKDOWN`
- **Gating**:
    - **Rendering**: The message bubble defaults to plain-text spans if the module is missing.
    - **Processing**: The markdown parser (`react-markdown`) is only invoked for licensed instances.
