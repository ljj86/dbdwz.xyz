param(
    [Parameter(Mandatory = $true)][string]$Source,
    [Parameter(Mandatory = $true)][string]$Target
)

$ErrorActionPreference = 'Stop'
$application = $null
$document = $null

try {
    $application = New-Object -ComObject Word.Application
    $application.Visible = $false
    $application.DisplayAlerts = 0
    $document = $application.Documents.Open($Source, $false, $true)
    # 17 = wdExportFormatPDF，兼容 Microsoft Word 与注册为 Word.Application 的 WPS。
    $document.ExportAsFixedFormat($Target, 17)
}
finally {
    if ($document) {
        try { $document.Close($false) } catch {}
        try { [Runtime.InteropServices.Marshal]::ReleaseComObject($document) | Out-Null } catch {}
    }
    if ($application) {
        try { $application.Quit() } catch {}
        try { [Runtime.InteropServices.Marshal]::ReleaseComObject($application) | Out-Null } catch {}
    }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}

if (-not (Test-Path -LiteralPath $Target)) {
    throw 'Office/WPS 未生成 PDF 文件。'
}
