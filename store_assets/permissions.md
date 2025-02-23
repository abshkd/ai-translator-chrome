# Chrome Web Store Permissions Documentation

## Permissions Justification

### Host Permission
- Permission: `https://openrouter.ai/*`
- Justification: Required to send text to our translation API endpoint. This is the only external service we connect to, and it's used solely for processing translation requests.
- Usage: Text is sent only when users actively request translation.

### Storage Permission
- Permission: `storage`
- Justification: Required to save user preferences locally, such as target language selection and translation settings.
- Usage: All data is stored locally on the user's device. No user data is transmitted or stored externally.

### ActiveTab Permission
- Permission: `activeTab`
- Justification: Required to access and translate content on the current webpage.
- Usage: Only activated when users explicitly request translation through the extension interface.

### Scripting Permission
- Permission: `scripting`
- Justification: Required to modify webpage content to display translations inline and overlay translated text on images.
- Usage: Only modifies webpage content to show translations, and only when users activate translation.

### Content Scripts
- Permission: `<all_urls>`
- Justification: Required to enable translation functionality across all websites.
- Usage: Content script only runs when translation is actively enabled by the user.

## Remote Code Usage Declaration

This extension does NOT use any remote code. All JavaScript and CSS is bundled within the extension package:

1. React and React DOM are bundled locally using esbuild
2. Tailwind CSS is compiled and bundled during build
3. All extension scripts (background, content, popup) are included in the package
4. No external scripts are loaded via CDN or remote URLs
5. No eval() or dynamic code execution is used
6. No external WebAssembly code is loaded

## Data Privacy

1. All translation preferences are stored locally
2. No user data is collected or stored externally
3. Text is only sent to OpenRouter API when translation is requested
4. No tracking or analytics code is included
5. No cookies are used or stored

## Security Measures

1. Content Security Policy (CSP) is implemented to prevent XSS
2. All API communications use HTTPS
3. No sensitive data is stored or transmitted
4. No third-party scripts or resources are loaded

Developed by Airith Pte Ltd
Contact: https://airith.com
