# Project Architecture Rules

- Route all viewer-facing videos sourced from `page_videos` through `BannerVideo`; this keeps playback controls consistent while background videos explicitly use background mode.