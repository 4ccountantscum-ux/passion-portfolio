---
# Created with: npm run new gym-atlas "{{title}}"
# Everything in this file is published with the site. Only write what you're happy to make public.

# ── Set automatically. Never change the id. ──
id: {{id}}
dateAdded: {{dateAdded}}
# Optional: a different URL name (defaults to the id).
# slug: {{id}}

# ── Required ──
title: {{titleYaml}}
fields:
  location:
    city: {{city}}
    country: {{country}}
    region:                   # optional: state / province
    neighborhood:
    address:
    coordinates:              # optional: [latitude, longitude], e.g. [40.7128, -74.0060]
  # visited | want-to-visit
  status: {{status}}
  # Required if visited: ["2024"], ["2024-05"] or ["2024-05-12"]
  visitDates: {{visitDates}}

  # ── Optional: fill in whenever ──
  founded:                    # e.g. 1965
  vibe:                       # a short phrase
  wentWith: []                # e.g. ["Name", "Name"]
  heardAbout:                 # how I heard about it
  peopleMet: []
  notablePeople: []           # notable people who train here
  notableEquipment: []
  nearbyFood: []              # e.g. ["Place: what to order"]
  nearbyAttractions: []

# ── Optional, shared with every domain ──
description:                  # one-line summary; cards show the location if blank
photos: []                    # put files in ./photos/, then list them:
#  - src: ./photos/front.jpg
#    caption: Front entrance
#    alt: What the photo shows
videos: []                    # links, e.g.:
#  - url: https://www.youtube.com/watch?v=...
#    caption: Training session
sources: []                   # e.g.:
#  - title: Article or video title
#    url: https://...
#    note: Why it matters
related: []                   # ids of other entries, e.g. [some-equipment-id]
tags: []
---

<!--
Write your personal notes and story below this comment, in plain text or Markdown.
Anything inside this comment stays hidden. Optional headings:
## The visit
## The training
## What stayed with me
-->
