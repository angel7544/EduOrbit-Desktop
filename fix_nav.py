import os
import re

SCREENS_DIR = r"d:\Major Project\EduOrbit Desktop\src\screens"
COMPONENTS_DIR = r"d:\Major Project\EduOrbit Desktop\src\components"

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    # Replace import
    content = re.sub(r"import\s+\{\s*useNavigation\s*\}\s+from\s+['\"]@react-navigation/native['\"];?", 
                     "import { useNavigate } from 'react-router-dom';", content)
                     
    # Remove useRoute if it exists, add useLocation
    if 'useRoute' in content:
        content = re.sub(r"import\s+\{\s*useRoute([^}]*)\}\s+from\s+['\"]@react-navigation/native['\"];?", 
                         "import { useLocation } from 'react-router-dom';", content)
        # Fix useRoute() call
        content = re.sub(r"const\s+route\s*=\s*useRoute(?:<any>)?\(\);?", "const location = useLocation();\n  const route = { params: location.state };", content)

    # If useNavigation was imported from somewhere else (like a generic import statement)
    if 'useNavigation' in content and 'useNavigate' not in content:
        content = content.replace("useNavigation", "useNavigate")
        # Ensure react-router-dom import exists
        if 'react-router-dom' not in content:
            content = "import { useNavigate, useLocation } from 'react-router-dom';\n" + content

    # Replace hook call
    content = re.sub(r"const\s+navigation\s*=\s*useNavigate(?:<any>)?\(\);?", "const navigate = useNavigate();", content)
    content = re.sub(r"const\s+navigation\s*=\s*useNavigation(?:<any>)?\(\);?", "const navigate = useNavigate();", content)

    # Replace navigation.navigate('Screen') -> navigate('/screen')
    # and navigation.navigate('Screen', { ... }) -> navigate('/screen', { state: { ... } })
    def nav_replacer(match):
        screen = match.group(1)
        params = match.group(2)
        route_path = '/' + screen.lower()
        if params:
            # params might have a leading comma, we need to strip it if we just capture it
            params = params.strip()
            if params.startswith(','):
                params = params[1:].strip()
            return f"navigate('{route_path}', {{ state: {params} }})"
        else:
            return f"navigate('{route_path}')"

    content = re.sub(r"navigation\.navigate\(\s*['\"]([^'\"]+)['\"]\s*(,[^)]+)?\)", nav_replacer, content)

    # Replace navigation.goBack() -> navigate(-1)
    content = re.sub(r"navigation\.goBack\(\)", "navigate(-1)", content)

    # Replace React Native specific things that are definitely missing
    content = content.replace("import { Ionicons } from '@expo/vector-icons';", "import { ChevronLeft as Ionicons } from 'lucide-react'; // FIXME")
    
    # Remove Reminders and Downloads entirely from the files (we already deleted the screens)
    if 'Downloads' in filepath or 'Reminder' in filepath:
        return # Skip processing if we somehow hit them

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {filepath}")

def process_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                fix_file(os.path.join(root, file))

process_dir(SCREENS_DIR)
process_dir(COMPONENTS_DIR)
