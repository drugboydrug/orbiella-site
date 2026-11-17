param([switch]$NoTest)
$p='C:\Users\admin\AppData\Local\Temp\claude\2cee6192c43e6a7c\eb9e4518-b42e-423b-80c9-64bad33963da\scratchpad\v3'
$T=[Text.Encoding]::UTF8; $u=New-Object Text.UTF8Encoding($false)
Add-Type -AssemblyName System.Web.Extensions
$js=New-Object System.Web.Script.Serialization.JavaScriptSerializer; $js.MaxJsonLength=10000000
$keys=@($js.DeserializeObject([IO.File]::ReadAllText("$p\prod\keys.json",$T)))
$en=@(([IO.File]::ReadAllText("$p\prod\en.txt",$T).Replace("`r","").TrimEnd("`n")) -split "`n")
$d=New-Object 'System.Collections.Generic.Dictionary[string,object]' ([StringComparer]::Ordinal)
for($i=0;$i -lt $keys.Count;$i++){ $d[[string]$keys[$i]]=@($en[$i]) }
foreach($ln in ([IO.File]::ReadAllText("$p\prod\en-extra.txt",$T).Replace("`r","") -split "`n")){ if($ln.Trim()){ $q=$ln -split '\|\|\|'; $d[$q[0]]=@($q[1]) } }
$stale=[regex]::Unescape('\u0435\u043d\u0435\u0434\u0436\u0435\u0440|\u041e\u0440\u0431\u0438\u044d\u043b\u043b\u0430'); foreach($k in @($d.Keys)){ if($k -match $stale){ [void]$d.Remove($k) } }
[IO.File]::WriteAllText("$p\prod\dict.json",$js.Serialize($d),$u)
& "$p\build-prod.ps1"
if(-not $NoTest){ . "$p\prodtest.ps1"; Test-Prod 'ru' ''; Test-Prod 'en' '' }
