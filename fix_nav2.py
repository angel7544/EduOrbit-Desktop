import os
import re

SCREENS_DIR = r"d:\Major Project\EduOrbit Desktop\src\screens"
COMPONENTS_DIR = r"d:\Major Project\EduOrbit Desktop\src\components"

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content

    content = re.sub(r"navigation\.replace\(\s*['\"]([^'\"]+)['\"]\s*(,[^)]+)?\)", lambda m: f"navigate('/{m.group(1).lower()}'{m.group(2) if m.group(2) else ''}, {{ replace: true }})", content)
    content = content.replace("navigation.canGoBack()", "window.history.length > 1")
    content = content.replace("navigation.navigate(action.route)", "navigate(`/${action.route.toLowerCase()}`)")
    content = content.replace("navigation.getParent()?.setOptions", "// navigation.getParent()?.setOptions")
    content = content.replace("navigation.addListener('focus',", "useEffect(() => { /* focus */ }, []); //")
    content = content.replace("navigation.isFocused()", "true")
    content = content.replace("navigation.navigate({", "navigate(-1); // FIXME: navigate({")
    content = content.replace("navigation.navigate(route.name)", "navigate(`/${route.name.toLowerCase()}`)")
    content = content.replace("const event = navigation.emit({", "const event = { defaultPrevented: false }; //")

    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed navigation edge cases in {filepath}")

def process_dir(directory):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                fix_file(os.path.join(root, file))

process_dir(SCREENS_DIR)
process_dir(COMPONENTS_DIR)
