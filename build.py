import os, re, tempfile

def load_env(env_path='.env'):
    env = {}
    if os.path.exists(env_path):
        with open(env_path, encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip().strip('"\'')
    return env

env = load_env()

firebase_config = f"""window.PLANNER_FIREBASE_CONFIG = {{
  apiKey: "{env.get('FIREBASE_API_KEY', 'PASTE_API_KEY_HERE')}",
  authDomain: "{env.get('FIREBASE_AUTH_DOMAIN', 'PASTE_AUTH_DOMAIN_HERE')}",
  projectId: "{env.get('FIREBASE_PROJECT_ID', 'PASTE_PROJECT_ID_HERE')}",
  storageBucket: "{env.get('FIREBASE_STORAGE_BUCKET', 'PASTE_STORAGE_BUCKET_HERE')}",
  messagingSenderId: "{env.get('FIREBASE_MESSAGING_SENDER_ID', 'PASTE_MESSAGING_SENDER_ID_HERE')}",
  appId: "{env.get('FIREBASE_APP_ID', 'PASTE_APP_ID_HERE')}"
}};
window.PLANNER_GOOGLE_CLIENT_ID = "{env.get('GOOGLE_CLIENT_ID', '')}";"""

s = open('src/shell.html', encoding='utf-8').read()
css = open('src/style.css', encoding='utf-8').read()
js = "\n".join(open('src/' + f, encoding='utf-8').read() for f in ['core.js','plan.js','habits_notes.js','editor.js','files.js','more.js','links.js','smart.js','focus.js','extras.js','insights.js','lock.js','shared.js','gcal.js','home.js','main.js'])

ver = re.search(r'VERSION = "planner-v(\d+)"', open('sw.js', encoding='utf-8').read()).group(1)
js = js.replace('__APP_VERSION__', ver)

# Replace <script src="config.js"></script> with inlined configuration from .env
config_script = f"<script>\n{firebase_config}\n</script>"
s = s.replace('<script src="config.js"></script>', config_script)

s = s.replace('/*CSS*/', css).replace('/*JS*/', js)
open('index.html', 'w', encoding='utf-8').write(s)

try:
    open(os.path.join(tempfile.gettempdir(), 'a.js'), 'w', encoding='utf-8').write(js)
except Exception:
    pass

print(len(s.splitlines()), "lines, version", ver)
