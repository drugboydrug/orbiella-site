. 'C:\Users\admin\AppData\Local\Temp\claude\2cee6192c43e6a7c\eb9e4518-b42e-423b-80c9-64bad33963da\scratchpad\v3\lib.ps1'
function Test-Prod([string]$lang='ru',[string]$extra='',[string]$theme='dark',[string]$file="$script:SP\prod\out\index.html"){
  $h=RF $file; $j=$h.LastIndexOf('</body>')
  $test='<pre id="t"></pre><script>(function(){var errs=[];window.addEventListener("error",function(e){errs.push(e.message)});var cons=console.error;setTimeout(function(){var q=function(s){return document.querySelector(s)},qa=function(s){return document.querySelectorAll(s)};var m=window.__i18nKeys().filter(function(k){return !window.__DICT[k]});var o=["LANG "+__L.lang,"MISSING("+m.length+"): "+JSON.stringify(m)];try{'+$extra+'}catch(e){o.push("EXC "+e.message)}o.push("hscroll="+(document.documentElement.scrollWidth>innerWidth+1)+" sw="+document.documentElement.scrollWidth+" iw="+innerWidth);document.getElementById("t").textContent=o.join("\n")+"\nerrs="+JSON.stringify(errs)},2500)})()</script>'
  $pre='<script>try{localStorage.setItem("lang","'+$lang+'");localStorage.setItem("theme","'+$theme+'")}catch(e){}</script>'
  $x=$h.Substring(0,$j)+$test+$h.Substring($j)
  $x=$x.Replace('<body>','<body>'+$pre)
  $f="$script:SP\prod\t-$lang.html"; WF $f $x
  $out="$script:SP\prod\to-$lang.txt"; $u="file:///"+$f.Replace('\','/')
  Start-Process -FilePath $script:EDGE -ArgumentList @('--headless','--disable-gpu','--no-first-run',"--user-data-dir=$script:SP\prof-pt$lang",'--virtual-time-budget=6000','--dump-dom',$u) -Wait -NoNewWindow -RedirectStandardOutput $out -RedirectStandardError "$script:SP\e.txt"
  [Net.WebUtility]::HtmlDecode([regex]::Match((RF $out),'<pre id="t">([\s\S]*?)</pre>').Groups[1].Value)
}

Add-Type -AssemblyName System.Drawing
function Tall-Prod([string]$tag,[string]$theme='dark',[int]$w=1280,[int]$h=9000,[string]$lang='ru',[string]$file="$script:SP\prod\out\index.html",[int]$seg=1500){
  $x=RF $file; $j=$x.LastIndexOf('</body>')
  $s='<script>setTimeout(function(){[].forEach.call(document.querySelectorAll(".rv"),function(e){e.classList.add("in")})},400)</script>'
  $pre='<script>try{localStorage.setItem("theme","'+$theme+'");localStorage.setItem("lang","'+$lang+'")}catch(e){}document.documentElement.setAttribute("data-ot","'+$theme+'")</script>'
  $x=($x.Substring(0,$j)+$s+$x.Substring($j)).Replace('<body>','<body>'+$pre)
  $f="$script:SP\prod\tall-$tag.html"; WF $f $x; $png="$script:SP\prod\tall-$tag.png"; if(Test-Path $png){Remove-Item $png}
  Start-Process -FilePath $script:EDGE -ArgumentList @('--headless','--disable-gpu','--no-first-run',"--user-data-dir=$script:SP\prof-tp$tag",'--force-prefers-reduced-motion',"--window-size=$w,$h",'--hide-scrollbars','--virtual-time-budget=8000',"--screenshot=$png",("file:///"+$f.Replace('\','/'))) -Wait -NoNewWindow -RedirectStandardError "$script:SP\e.txt" -RedirectStandardOutput "$script:SP\o.txt"
  $bmp=New-Object System.Drawing.Bitmap $png; $n=0
  for($y=0;$y -lt $bmp.Height;$y+=$seg){ $hh=[Math]::Min($seg,$bmp.Height-$y); $c=$bmp.Clone((New-Object System.Drawing.Rectangle 0,$y,$bmp.Width,$hh),$bmp.PixelFormat); $c.Save("$script:SP\prod\$tag-$n.png"); $c.Dispose(); $n++ }
  $bmp.Dispose(); "$tag segments $n (page height $h)"
}
function Tall-Mob([string]$tag,[int]$w=390,[int]$h=11000,[string]$theme='dark',[int]$seg=1400,[string]$pre2=''){
  $x=RF "$script:SP\prod\out\index.html"; $j=$x.LastIndexOf('</body>')
  $s='<script>setTimeout(function(){[].forEach.call(document.querySelectorAll(".rv"),function(e){e.classList.add("in")});'+$pre2+'},400)</script>'
  $pre='<script>try{localStorage.setItem("theme","'+$theme+'");localStorage.setItem("lang","ru")}catch(e){}document.documentElement.setAttribute("data-ot","'+$theme+'")</script>'
  $x=($x.Substring(0,$j)+$s+$x.Substring($j)).Replace('<body>','<body>'+$pre)
  $f="$script:SP\prod\mob-$tag.html"; WF $f $x
  $wr="$script:SP\prod\mobw-$tag.html"; WF $wr ('<!doctype html><body style="margin:0;background:#888"><iframe src="mob-'+$tag+'.html" style="width:'+$w+'px;height:'+$h+'px;border:0;display:block"></iframe></body>')
  $png="$script:SP\prod\mobw-$tag.png"; if(Test-Path $png){Remove-Item $png}
  Start-Process -FilePath $script:EDGE -ArgumentList @('--headless','--disable-gpu','--no-first-run','--allow-file-access-from-files',"--user-data-dir=$script:SP\prof-mb$tag",'--force-prefers-reduced-motion',"--window-size=$($w+16),$h",'--hide-scrollbars','--virtual-time-budget=9000',"--screenshot=$png",("file:///"+$wr.Replace('\','/'))) -Wait -NoNewWindow -RedirectStandardError "$script:SP\e.txt" -RedirectStandardOutput "$script:SP\o.txt"
  $bmp=New-Object System.Drawing.Bitmap $png; $n=0
  for($y=0;$y -lt $bmp.Height;$y+=$seg){ $hh=[Math]::Min($seg,$bmp.Height-$y); $c=$bmp.Clone((New-Object System.Drawing.Rectangle 0,$y,([Math]::Min($w,$bmp.Width)),$hh),$bmp.PixelFormat); $c.Save("$script:SP\prod\m$tag-$n.png"); $c.Dispose(); $n++ }
  $bmp.Dispose(); "m$tag segments $n"
}