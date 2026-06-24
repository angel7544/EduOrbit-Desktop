import os
import re

def fix_imports():
    src_dir = r"d:\Major Project\EduOrbit Desktop\src"
    for root, _, files in os.walk(src_dir):
        for filename in files:
            if filename.endswith(".tsx") or filename.endswith(".ts"):
                filepath = os.path.join(root, filename)
                with open(filepath, 'r', encoding='utf-8') as f:
                    content = f.read()

                if "useNavigate" in content:
                    pattern = r"import\s+\{([^}]*)\}\s+from\s+['\"]@react-navigation/native['\"];?"
                    def replacer(match):
                        imports = [i.strip() for i in match.group(1).split(',')]
                        if 'useNavigate' in imports:
                            imports.remove('useNavigate')
                        if not imports:
                            return ''
                        return f"import {{ {', '.join(imports)} }} from '@react-navigation/native';"
                    
                    new_content = re.sub(pattern, replacer, content)
                    if new_content != content:
                        with open(filepath, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        print(f"Fixed {filepath}")

if __name__ == "__main__":
    fix_imports()
