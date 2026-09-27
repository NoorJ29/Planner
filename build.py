import os, re, tempfile

s = open('src/shell.html', encoding='utf-8').read()
css = open('src/style.css', encoding='utf-8').read()
js = "\n".join(open('src/' + f, encoding='utf-8').read() for f in ['core.js','plan.js','habits_notes.js','editor.js','files.js','more.js','links.js','smart.js','focus.js','extras.js','insights.js','lock.js','shared.js','gcal.js','home.js','main.js'])

ver = re.search(r'VERSION = "planner-v(\d+)"', open('sw.js', encoding='utf-8').read()).group(1)
js = js.replace('__APP_VERSION__', ver)
s = s.replace('/*CSS*/', css).replace('/*JS*/', js)
open('index.html', 'w', encoding='utf-8').write(s)
try:
    open(os.path.join(tempfile.gettempdir(), 'a.js'), 'w', encoding='utf-8').write(js)
except Exception:
    pass
print(len(s.splitlines()), "lines, version", ver)

