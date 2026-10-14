## Remaining quota at a glance

See how much provider quota remains in a sidebar card or in plugin settings.
Each account shows its provider, plan, quota windows, and reset times.
The All tab groups accounts from multiple providers in one view.

## Percentages and warnings

The percentage and bar show the remaining share of each quota window.
At zero remaining, the bar is empty.
Yellow means 20% or less remains. Red means 5% or less remains.
Tooltips and screen-reader labels use the same remaining-quota meaning.
Monetary limits also retain spending details.

## Sources and requirements

The plugin reads usage from enabled BB provider plugins and shared sources such as Account Pooler.
It requires BB 0.46.0 or later and Plugin SDK 0.6.37 or later.
Git installation also requires npm on PATH.
Missing measurements and account authentication errors keep their separate states.
Failed refreshes retain the last available measurements.

## Independent plugin

Provider remaining derives from BB's MIT-licensed Provider usage plugin.
It has its own plugin ID and can run alongside the built-in plugin.
The source API remains unchanged.
This project is maintained independently of BB.
