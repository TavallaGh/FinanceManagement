#!/usr/bin/env pwsh
<#
.SYNOPSIS
Quick taskclose command - wrapper for taskclose.ps1

.DESCRIPTION
Simplified taskclose command. Usage:
  taskclose AC-47
  taskclose AC-14-01 -GeneratePostman

.PARAMETER TaskId
The task ID (e.g., AC-47)

.PARAMETER GeneratePostman
Force Postman generation (default: true)
#>

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$TaskId,
    
    [bool]$GeneratePostman = $true
)

# Resolve script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Call main taskclose script
& "$scriptDir/taskclose.ps1" -TaskId $TaskId -GeneratePostman $GeneratePostman
