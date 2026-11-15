import React, { useState } from 'react';
import {
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Copy,
  Check,
  Compass,
  ChevronRight,
  Monitor,
  Flame,
  Cpu
} from 'lucide-react';
import { Icon } from './Icon';
import { Button } from './Button';

export type SupportedBrowser = 'chrome' | 'firefox' | 'safari' | 'linux';

export interface ViewportTelemetryAlertProps {
  title?: string;
  message?: string;
  error?: Error | null;
  onReset?: () => void;
  onSwitchToHorizon?: () => void;
}

export interface BrowserInstructionStep {
  title: string;
  action: string;
  description: string;
  highlight?: string;
}

export interface BrowserInstruction {
  id: SupportedBrowser;
  label: string;
  badge?: string;
  directUrl?: string;
  steps: BrowserInstructionStep[];
}

export function detectBrowser(): SupportedBrowser {
  if (typeof navigator === 'undefined') return 'chrome';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('firefox')) return 'firefox';
  if (
    ua.includes('safari') &&
    !ua.includes('chrome') &&
    !ua.includes('chromium') &&
    !ua.includes('edg')
  ) {
    return 'safari';
  }
  return 'chrome';
}

export const BROWSER_INSTRUCTIONS: BrowserInstruction[] = [
  {
    id: 'chrome',
    label: 'Chrome / Edge / Brave',
    badge: 'Chromium',
    directUrl: 'chrome://settings/system',
    steps: [
      {
        title: 'Open Browser Settings',
        action: 'Go to Settings',
        description:
          'Click the menu icon (⋮ or ⋯) in the top-right corner of your browser and select Settings, or paste the direct URL in a new tab.',
        highlight: 'chrome://settings/system'
      },
      {
        title: 'Navigate to System',
        action: 'Select System',
        description:
          'In the left sidebar navigation, click on "System" (or "System and performance" in Microsoft Edge).'
      },
      {
        title: 'Enable Graphics Acceleration',
        action: 'Turn on "Use graphics acceleration when available"',
        description:
          'Toggle the switch ON for "Use graphics acceleration when available" (or "Use hardware acceleration when available").',
        highlight: 'Use graphics acceleration when available'
      },
      {
        title: 'Relaunch & Retry',
        action: 'Relaunch the browser and try',
        description:
          'Click the "Relaunch" button next to the toggle (or completely restart the browser), then reload Odysseia.'
      }
    ]
  },
  {
    id: 'firefox',
    label: 'Mozilla Firefox',
    badge: 'Gecko',
    directUrl: 'about:preferences',
    steps: [
      {
        title: 'Open Firefox Settings',
        action: 'Go to Settings',
        description:
          'Click the menu button (☰) in the top-right corner and select Settings, or enter about:preferences in your address bar.',
        highlight: 'about:preferences'
      },
      {
        title: 'Navigate to Performance',
        action: 'Scroll to Performance',
        description:
          'In the General settings tab, scroll down until you reach the "Performance" section.'
      },
      {
        title: 'Enable Hardware Acceleration',
        action: 'Turn on "Use hardware acceleration when available"',
        description:
          'Uncheck "Use recommended performance settings", then check the box for "Use hardware acceleration when available".',
        highlight: 'Use hardware acceleration when available'
      },
      {
        title: 'Restart Firefox & Retry',
        action: 'Relaunch the browser and try',
        description:
          'Close and restart Firefox to apply hardware graphics acceleration, then return to Odysseia.'
      }
    ]
  },
  {
    id: 'safari',
    label: 'Apple Safari',
    badge: 'macOS',
    steps: [
      {
        title: 'Open Safari Settings',
        action: 'Go to Settings / Preferences',
        description:
          'In the top menu bar, go to Safari > Settings (or Preferences, or press ⌘ ,).'
      },
      {
        title: 'Enable Developer Features',
        action: 'Check "Show features for web developers"',
        description:
          'Switch to the Advanced tab and ensure the box "Show features for web developers" (or "Show Develop menu") is checked.'
      },
      {
        title: 'Verify WebGL Acceleration',
        action: 'Enable WebGL in Develop Flags',
        description:
          'In the Develop menu at the top, inspect Feature Flags to verify WebGL 2.0 and GPU acceleration are enabled. In macOS System Settings > Battery/Displays, allow automatic graphics switching.'
      },
      {
        title: 'Restart Safari & Retry',
        action: 'Relaunch the browser and try',
        description:
          'Quit Safari completely (⌘ Q), relaunch it, and reload Odysseia.'
      }
    ]
  },
  {
    id: 'linux',
    label: 'Linux / GPU Flags',
    badge: 'Advanced',
    directUrl: 'chrome://flags/#ignore-gpu-blocklist',
    steps: [
      {
        title: 'Override GPU Blocklist',
        action: 'Enable Override Software Rendering',
        description:
          'Navigate to chrome://flags/#ignore-gpu-blocklist in Chromium/Chrome and set the flag to "Enabled".',
        highlight: 'chrome://flags/#ignore-gpu-blocklist'
      },
      {
        title: 'Enable GPU Rasterization',
        action: 'Enable GPU Rasterization Flag',
        description:
          'Navigate to chrome://flags/#enable-gpu-rasterization and set to "Enabled".',
        highlight: 'chrome://flags/#enable-gpu-rasterization'
      },
      {
        title: 'Verify GPU Status',
        action: 'Confirm Hardware Acceleration',
        description:
          'Open chrome://gpu to confirm that WebGL and WebGL2 report "Hardware accelerated".'
      },
      {
        title: 'Relaunch Browser & Retry',
        action: 'Relaunch the browser and try',
        description:
          'Click the blue "Relaunch" button at the bottom of the window to apply GPU flags, then reload Odysseia.'
      }
    ]
  }
];

export function ViewportTelemetryAlert({
  title = 'Viewport Telemetry Alert',
  message,
  error,
  onReset,
  onSwitchToHorizon
}: ViewportTelemetryAlertProps): React.JSX.Element {
  const [selectedBrowser, setSelectedBrowser] = useState<SupportedBrowser>(detectBrowser);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const currentInstruction =
    BROWSER_INSTRUCTIONS.find((b) => b.id === selectedBrowser) || BROWSER_INSTRUCTIONS[0];

  const handleCopy = (url: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setCopiedUrl(url);
          setTimeout(() => setCopiedUrl(null), 2000);
        })
        .catch(() => {});
    }
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex h-full w-full min-h-[440px] items-center justify-center p-3 sm:p-6 select-none overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-panel-border bg-[#141210]/95 p-5 sm:p-6 backdrop-blur-md shadow-2xl space-y-5">
        {/* Header with Alert Badge */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning border border-warning/30 shadow-sm shadow-warning/10">
            <Icon icon={AlertTriangle} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-sans text-base font-bold text-ink tracking-tight">
                {title}
              </h3>
              <span className="inline-flex items-center gap-1 rounded-md bg-warning/10 px-2 py-0.5 font-mono text-[11px] font-medium text-warning border border-warning/25">
                <Icon icon={Cpu} size={16} />
                <span>Graphics Acceleration Required</span>
              </span>
            </div>
            <p className="mt-1 font-sans text-xs text-muted leading-relaxed">
              {message ||
                'Hardware graphics acceleration (WebGL) is unavailable or disabled in your browser. 3D lunar surface topography, raycast shadow computation, and solar ephemeris require 3D graphics acceleration.'}
            </p>
          </div>
        </div>

        {/* Browser Tabs Switcher */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-sans text-muted">
            <span className="font-medium text-ink">
              Select your browser to view required setup steps:
            </span>
            {currentInstruction.directUrl && (
              <button
                type="button"
                onClick={() => handleCopy(currentInstruction.directUrl!)}
                className="inline-flex items-center gap-1 text-amber hover:text-amber-hover transition-colors font-mono text-[11px]"
                title="Copy settings address"
              >
                <Icon icon={copiedUrl === currentInstruction.directUrl ? Check : Copy} size={16} />
                <span>
                  {copiedUrl === currentInstruction.directUrl
                    ? 'Copied URL!'
                    : `Copy ${currentInstruction.directUrl}`}
                </span>
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Browser instruction tabs"
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface/80 border border-panel-border"
          >
            {BROWSER_INSTRUCTIONS.map((browser) => {
              const isSelected = browser.id === selectedBrowser;
              return (
                <button
                  key={browser.id}
                  role="tab"
                  aria-selected={isSelected}
                  type="button"
                  onClick={() => setSelectedBrowser(browser.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-sans text-xs transition-all ${
                    isSelected
                      ? 'bg-amber text-amber-text font-semibold shadow-sm'
                      : 'text-muted hover:text-ink hover:bg-white/5'
                  }`}
                >
                  <Icon
                    icon={browser.id === 'firefox' ? Flame : browser.id === 'chrome' ? Monitor : Cpu}
                    size={16}
                  />
                  <span>{browser.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Ordered Step-by-Step Instructions */}
        <div
          role="tabpanel"
          aria-label={`${currentInstruction.label} instructions`}
          className="space-y-2 rounded-xl border border-panel-border/80 bg-surface/40 p-3.5"
        >
          {currentInstruction.steps.map((step, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-lg border border-panel-border/50 bg-[#161412]/80 p-2.5 transition-colors hover:border-amber/30"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber/30 bg-amber/15 font-mono text-xs font-bold text-amber">
                0{idx + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-sans text-xs font-semibold text-ink">
                    {step.action}
                  </span>
                  {step.highlight && (
                    <code className="font-mono text-[11px] text-amber/90 bg-amber/10 px-1.5 py-0.5 rounded border border-amber/20">
                      {step.highlight}
                    </code>
                  )}
                </div>
                <p className="mt-0.5 font-sans text-xs text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>

              {step.highlight && (
                <button
                  type="button"
                  onClick={() => handleCopy(step.highlight!)}
                  className="shrink-0 p-1.5 rounded-md hover:bg-white/5 text-muted hover:text-ink transition-colors"
                  title="Copy path to clipboard"
                  aria-label={`Copy ${step.highlight}`}
                >
                  <Icon
                    icon={copiedUrl === step.highlight ? Check : Copy}
                    size={16}
                    className={copiedUrl === step.highlight ? 'text-success' : ''}
                  />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Instant Fallback Callout */}
        {onSwitchToHorizon && (
          <div className="rounded-xl border border-amber/25 bg-amber/5 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 p-1 rounded-lg bg-amber/15 text-amber">
                <Icon icon={Compass} size={16} />
              </div>
              <div>
                <h4 className="font-sans text-xs font-bold text-ink">
                  Continue immediately with 2D Horizon Panorama
                </h4>
                <p className="font-sans text-[11px] text-muted">
                  Zero WebGL required. Full solar elevation tracking, terrain horizon profiles, and Earth comms line-of-sight.
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={onSwitchToHorizon}
              className="shrink-0 flex items-center gap-1.5 text-xs whitespace-nowrap"
            >
              <span>Switch to 2D Horizon</span>
              <Icon icon={ChevronRight} size={16} />
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-panel-border/60">
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs text-ink"
            >
              <Icon icon={RotateCcw} size={16} />
              <span>Retry Viewport Telemetry</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.location.reload();
                }
              }}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-ink"
            >
              <Icon icon={RefreshCw} size={16} />
              <span>Reload App</span>
            </Button>
          </div>

          {error?.message && (
            <span
              className="font-mono text-[10px] text-muted truncate max-w-[220px]"
              title={error.message}
            >
              Diagnostic: {error.message}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
