# GithubCLIExtractor Build Helper Script
# Usage: .\build.ps1 [option]
# Options: clean, gui, cli, all, dev, test, help

param(
    [string]$Task = "help"
)

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectRoot

# Colors for output
$Success = @{ ForegroundColor = "Green" }
$Warning = @{ ForegroundColor = "Yellow" }
$ErrorColor = @{ ForegroundColor = "Red" }
$Info = @{ ForegroundColor = "Cyan" }

function Show-Help {
    Write-Host ""
    Write-Host "GithubCLIExtractor Build Helper" @Info
    Write-Host "================================" @Info
    Write-Host ""
    Write-Host "Available Commands:" @Info
    Write-Host ""
    Write-Host "  .\build.ps1 clean        - Clean output directories" 
    Write-Host "  .\build.ps1 gui          - Build Electron GUI"
    Write-Host "  .\build.ps1 cli          - Build CLI only"
    Write-Host "  .\build.ps1 all          - Clean and build CLI + GUI"
    Write-Host "  .\build.ps1 dev          - Start GUI in dev mode"
    Write-Host "  .\build.ps1 test         - Run all tests"
    Write-Host "  .\build.ps1 test-cov     - Run tests with coverage"
    Write-Host "  .\build.ps1 lint         - Run linter"
    Write-Host "  .\build.ps1 lint-fix     - Fix linting issues"
    Write-Host "  .\build.ps1 format       - Format code with prettier"
    Write-Host "  .\build.ps1 help         - Show this help message"
    Write-Host ""
}

function Run-Command {
    param([string]$Command)
    Write-Host ""
    Write-Host "Running: $Command" @Info
    Write-Host "====================================" @Info
    Write-Host ""
    
    Invoke-Expression $Command
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "[OK] Command completed successfully" @Success
    } else {
        Write-Host ""
        Write-Host "[ERROR] Command failed with exit code $LASTEXITCODE" @ErrorColor
        exit 1
    }
    Write-Host ""
}

switch ($Task.ToLower()) {
    "clean" {
        Run-Command "npm run clean:gui"
    }
    "gui" {
        Run-Command "npm run build:gui"
    }
    "cli" {
        Run-Command "npm run build"
    }
    "all" {
        Run-Command "npm run build:all"
    }
    "dev" {
        Run-Command "npm run dev:gui"
    }
    "test" {
        Run-Command "npm test"
    }
    "test-cov" {
        Run-Command "npm run test:coverage"
    }
    "lint" {
        Run-Command "npm run lint"
    }
    "lint-fix" {
        Run-Command "npm run lint:fix"
    }
    "format" {
        Run-Command "npm run format"
    }
    "help" {
        Show-Help
    }
    default {
        Write-Host "[ERROR] Unknown command: $Task" @ErrorColor
        Write-Host ""
        Show-Help
        exit 1
    }
}
