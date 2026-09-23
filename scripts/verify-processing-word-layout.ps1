param([string]$FixtureDirectory = 'scratch/word-export-qa')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$directory = (Resolve-Path -LiteralPath $FixtureDirectory).Path
Write-Output 'Starting isolated Word automation'
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$results = @()
try {
    foreach ($file in Get-ChildItem -LiteralPath $directory -Filter '*.docx') {
        Write-Output "Opening $($file.Name)"
        $doc = $word.Documents.Open($file.FullName, $false, $true)
        try {
            Write-Output "Paginating $($file.Name)"
            $doc.Windows.Item(1).View.Type = 3
            $doc.Repaginate()
            Write-Output "Exporting $($file.Name)"
            # Render Word's page metafiles directly; PDF publishing can wait on
            # installed Office add-ins even with DisplayAlerts disabled.
            $text = $doc.Content.Text
            $required = Get-Content -LiteralPath (Join-Path $directory 'required-phrases.json') -Raw -Encoding UTF8 | ConvertFrom-Json
            foreach ($phrase in $required) {
                if (-not $text.Contains($phrase)) { throw "Missing required phrase: $phrase" }
            }
            $broken = @()
            $pages = $doc.Windows.Item(1).Panes.Item(1).Pages
            for ($i = 1; $i -le $pages.Count; $i++) {
                [byte[]]$bits = $pages.Item($i).EnhMetaFileBits
                $stream = [System.IO.MemoryStream]::new($bits, 0, $bits.Length)
                $image = [System.Drawing.Image]::FromStream($stream)
                $bitmap = [System.Drawing.Bitmap]::new(2000, [int](2000 * $image.Height / $image.Width))
                $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
                $graphics.Clear([System.Drawing.Color]::White)
                $graphics.DrawImage($image, 0, 0, $bitmap.Width, $bitmap.Height)
                $bitmap.Save((Join-Path $directory ($file.BaseName + '-' + $i + '.png')), [System.Drawing.Imaging.ImageFormat]::Png)
                $graphics.Dispose(); $bitmap.Dispose(); $image.Dispose(); $stream.Dispose()
            }
            Write-Output "Checking words in $($file.Name)"
            $words = $doc.Content.Words
            for ($j = 1; $j -le $words.Count; $j++) {
                $range = $words.Item($j).Duplicate
                while ($range.Characters.Count -gt 1 -and $range.Characters.Last.Text -match '^\s+$') { $range.MoveEnd(1, -1) | Out-Null }
                if ($range.Text -notmatch '\p{L}{2}') { continue }
                $first = $range.Characters.First
                $last = $range.Characters.Last
                if ($first.Information(3) -ne $last.Information(3) -or [Math]::Abs($first.Information(6) - $last.Information(6)) -gt 1) { $broken += $range.Text }
            }
            $results += [pscustomobject]@{ register = $file.BaseName; pages = $pages.Count; splitWords = $broken }
        } finally { $doc.Close(0) }
    }
} finally { $word.Quit() }
$results | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $directory 'layout-results.json') -Encoding UTF8
$results | ConvertTo-Json -Depth 5
if (@($results | Where-Object { $_.splitWords.Count -gt 0 }).Count -gt 0) { throw 'Word split one or more words across lines.' }
