# Project Architecture Rules

- Route all viewer-facing videos sourced from `page_videos` through `BannerVideo`; this keeps playback controls consistent while background videos explicitly use background mode.
- Keep Make Money message bodies referral-agnostic in storage and append the signed-in member's canonical referral URL when rendering; this prevents stale or mismatched referral credit.
- Store age-verification selfies in the private `age-verification-selfies` bucket and expose only short-lived signed URLs through authorized edge functions; selfies are sensitive identity evidence.