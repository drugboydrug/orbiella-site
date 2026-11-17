. 'C:\Users\admin\AppData\Local\Temp\claude\2cee6192c43e6a7c\eb9e4518-b42e-423b-80c9-64bad33963da\scratchpad\v3\lib.ps1'
$P="$SP\prod"
$wm=RF "$P\wm-symbol.html"
$wmL=$wm.Replace('id="wm"','id="wm-l"').Replace('#FFD8B5','#B9788F')
$body=(RF "$P\body.html").Replace('{{WM}}',($wm+$wmL))
$css=RF "$P\style.css"
$inner=[regex]::Match($wm,'<symbol[^>]*>([\s\S]*)</symbol>').Groups[1].Value
$maskSvg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 300" fill="#000">'+$inner+'</svg>'
$maskUri='data:image/svg+xml;base64,'+[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($maskSvg))
$css=$css.Replace('{{WMMASK}}',$maskUri)
$dictPath="$P\dict.json"; $dict= if(Test-Path $dictPath){ RF $dictPath } else { '{}' }
$js=(RF "$P\app.js")+"`n"+(RF "$P\engine.js").Replace('__DICT_JSON__',$dict)
$html=(RF "$P\head.html").Replace('{{CSS}}',$css).Replace('{{BODY}}',$body).Replace('{{JS}}',$js)
New-Item -ItemType Directory -Force "$P\out" | Out-Null
WF "$P\out\index.html" $html

"built " + $html.Length + " chars"