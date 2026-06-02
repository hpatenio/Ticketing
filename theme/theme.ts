// =============================================================================
// theme.ts — Full Design Token Scaffold
// =============================================================================
// HOW TO USE (for the designer):
//   Every value marked  👉 "DESIGNER_PICK"  needs a hex color chosen by you.
//   Values already filled in are locked from the existing palette — do not change.
//   Leave comments beside your chosen values (e.g. why you picked that color).
//
// NAMING CONVENTION:
//   *Bg   → background fill
//   *Text → text/label on top of that fill
//   *Border → stroke/outline
// =============================================================================

// ---------------------------------------------------------------------------
// Light Theme
// ---------------------------------------------------------------------------
const lightTheme = {
  mode: "light" as const,

  // --- Base Surfaces --------------------------------------------------------
  // The layering order (bottom → top): background → surface → surfaceRaised
  background:    "#F7FBFE",        // ✅ locked — outermost screen fill
  surface:       "#FFFFFF",        // ✅ locked — cards, sheets, inputs
  surfaceRaised: "DESIGNER_PICK",  // 👉 elevated cards, dropdowns (try slightly off-white e.g. #FAFCFD)
  border:        "#E8F4F8",        // ✅ locked — dividers, outlines
  borderStrong:  "DESIGNER_PICK",  // 👉 focused input ring, emphasis borders (try #B8D8E4)
  overlay:       "DESIGNER_PICK",  // 👉 modal scrim — should be rgba, e.g. "rgba(15,28,34,0.4)"

  // --- Typography -----------------------------------------------------------
  text:          "#1D4B5C",        // ✅ locked — headings, body, labels
  subtext:       "#669BAE",        // ✅ locked — captions, meta, placeholders
  textDisabled:  "DESIGNER_PICK",  // 👉 disabled labels/icons (try #A8C8D4)
  textInverse:   "DESIGNER_PICK",  // 👉 text on dark/brand fills (try #FFFFFF)
  textLink:      "DESIGNER_PICK",  // 👉 hyperlinks (try #35A2CA or a darker shade)
  textLinkHover: "DESIGNER_PICK",  // 👉 hovered link (try #1D7FA8)

  // --- Brand / Primary Action -----------------------------------------------
  // Used for: primary buttons, active controls, focus rings, CTAs
  primary:            "#35A2CA",   // ✅ locked — brand blue
  primaryHover:       "DESIGNER_PICK", // 👉 primary button hovered (try #2A8DB2)
  primaryPressed:     "DESIGNER_PICK", // 👉 primary button pressed (try #1F7A9A)
  primaryDisabled:    "DESIGNER_PICK", // 👉 primary button disabled (try #93D3EA)
  primaryText:        "DESIGNER_PICK", // 👉 text/icon ON a primary-colored fill (try #FFFFFF)
  primarySubtle:      "DESIGNER_PICK", // 👉 tinted bg for chips, badges (try #E6F6FB)
  primarySubtleText:  "DESIGNER_PICK", // 👉 text on primarySubtle bg (try #1D7FA8)

  // --- Sidebar / Bottom Nav ------------------------------------------------
  sidebarBg:     "#FFFFFF",        // ✅ locked
  navBorder:     "#E8F4F8",        // ✅ locked
  iconActive:    "#35A2CA",        // ✅ locked
  iconInactive:  "#93D3EA",        // ✅ locked
  textActive:    "#1D4B5C",        // ✅ locked
  textInactive:  "#669BAE",        // ✅ locked
  bgActive:      "#F4FBFE",        // ✅ locked
  bgHover:       "#F0F9FF",        // ✅ locked
  activeBar:     "#35A2CA",        // ✅ locked

  // --- Semantic: Success ----------------------------------------------------
  successBg:     "DESIGNER_PICK",  // 👉 success toast / banner bg (try #EAF7F0)
  successBorder: "DESIGNER_PICK",  // 👉 success border (try #6ECFA0)
  successText:   "DESIGNER_PICK",  // 👉 success message text (try #0F6E56)
  successIcon:   "DESIGNER_PICK",  // 👉 checkmark icon (try #1D9E75)

  // --- Semantic: Warning ----------------------------------------------------
  warningBg:     "DESIGNER_PICK",  // 👉 warning toast / banner bg (try #FEF6E4)
  warningBorder: "DESIGNER_PICK",  // 👉 warning border (try #F5C842)
  warningText:   "DESIGNER_PICK",  // 👉 warning message text (try #7A5A00)
  warningIcon:   "DESIGNER_PICK",  // 👉 warning icon (try #E5A800)

  // --- Semantic: Danger / Error ---------------------------------------------
  dangerBg:      "DESIGNER_PICK",  // 👉 error toast / banner bg (try #FDEAEA)
  dangerBorder:  "DESIGNER_PICK",  // 👉 error input border / ring (try #E57373)
  dangerText:    "DESIGNER_PICK",  // 👉 error message text (try #8B1A1A)
  dangerIcon:    "DESIGNER_PICK",  // 👉 error icon (try #D32F2F)

  // --- Semantic: Info -------------------------------------------------------
  infoBg:        "DESIGNER_PICK",  // 👉 info banner bg (try #E6F4FB)
  infoBorder:    "DESIGNER_PICK",  // 👉 info border (try #7CC4E0)
  infoText:      "DESIGNER_PICK",  // 👉 info message text (try #0C4A6E)
  infoIcon:      "DESIGNER_PICK",  // 👉 info icon (try #35A2CA)

  // --- Form / Input Fields --------------------------------------------------
  inputBg:           "DESIGNER_PICK", // 👉 input fill (try #FFFFFF or background)
  inputBorder:       "DESIGNER_PICK", // 👉 default input border (try #E8F4F8)
  inputBorderFocus:  "DESIGNER_PICK", // 👉 focused ring (try #35A2CA)
  inputBorderError:  "DESIGNER_PICK", // 👉 same as dangerBorder
  inputPlaceholder:  "DESIGNER_PICK", // 👉 placeholder text (try #A8C8D4)
  inputText:         "#1D4B5C",       // ✅ same as text
  inputDisabledBg:   "DESIGNER_PICK", // 👉 disabled input fill (try #F0F7FA)

  // --- Skeleton / Loading ---------------------------------------------------
  skeletonBase:      "DESIGNER_PICK", // 👉 base shimmer color (try #E8F4F8)
  skeletonHighlight: "DESIGNER_PICK", // 👉 shimmer sweep color (try #F5FBFE)

  // --- Misc UI --------------------------------------------------------------
  scrollbar:         "DESIGNER_PICK", // 👉 scrollbar thumb (try #B8D8E4)
  shadow:            "DESIGNER_PICK", // 👉 card/modal drop shadow — use rgba e.g. "rgba(29,75,92,0.08)"
  badgeText:         "DESIGNER_PICK", // 👉 notification badge text (try #FFFFFF)
  badgeBg:           "DESIGNER_PICK", // 👉 notification badge bg (try #E53935 or brand red)
};

// ---------------------------------------------------------------------------
// Dark Theme
// ---------------------------------------------------------------------------
const darkTheme = {
  mode: "dark" as const,

  // --- Base Surfaces --------------------------------------------------------
  background:    "#0F1C22",        // ✅ locked
  surface:       "#162630",        // ✅ locked
  surfaceRaised: "DESIGNER_PICK",  // 👉 elevated cards, dropdowns (try #1C3040)
  border:        "#1E3340",        // ✅ locked
  borderStrong:  "DESIGNER_PICK",  // 👉 focused input ring (try #35A2CA at low opacity, or #2A5F78)
  overlay:       "DESIGNER_PICK",  // 👉 modal scrim (try "rgba(0,0,0,0.6)")

  // --- Typography -----------------------------------------------------------
  text:          "#E2F0F5",        // ✅ locked
  subtext:       "#6B9BAD",        // ✅ locked
  textDisabled:  "DESIGNER_PICK",  // 👉 (try #3A6070)
  textInverse:   "DESIGNER_PICK",  // 👉 text on light fills (try #0F1C22)
  textLink:      "DESIGNER_PICK",  // 👉 (try #5DC8E8)
  textLinkHover: "DESIGNER_PICK",  // 👉 (try #8DDAF2)

  // --- Brand / Primary Action -----------------------------------------------
  primary:            "#35A2CA",   // ✅ locked
  primaryHover:       "DESIGNER_PICK", // 👉 (try #3FB8E0)
  primaryPressed:     "DESIGNER_PICK", // 👉 (try #2A8DB2)
  primaryDisabled:    "DESIGNER_PICK", // 👉 (try #2E6B82)
  primaryText:        "DESIGNER_PICK", // 👉 text ON primary fill (try #0F1C22 or #FFFFFF)
  primarySubtle:      "DESIGNER_PICK", // 👉 tinted bg (try #1A3A4A)
  primarySubtleText:  "DESIGNER_PICK", // 👉 text on primarySubtle (try #7ECDE8)

  // --- Sidebar / Bottom Nav ------------------------------------------------
  sidebarBg:     "#111E26",        // ✅ locked
  navBorder:     "#1E3340",        // ✅ locked
  iconActive:    "#35A2CA",        // ✅ locked
  iconInactive:  "#2E6B82",        // ✅ locked
  textActive:    "#C8E8F2",        // ✅ locked
  textInactive:  "#4E7D8E",        // ✅ locked
  bgActive:      "#1A3040",        // ✅ locked
  bgHover:       "#1E3545",        // ✅ locked
  activeBar:     "#35A2CA",        // ✅ locked

  // --- Semantic: Success ----------------------------------------------------
  successBg:     "DESIGNER_PICK",  // 👉 (try #0D2E22)
  successBorder: "DESIGNER_PICK",  // 👉 (try #1D9E75)
  successText:   "DESIGNER_PICK",  // 👉 (try #5DCAA5)
  successIcon:   "DESIGNER_PICK",  // 👉 (try #1D9E75)

  // --- Semantic: Warning ----------------------------------------------------
  warningBg:     "DESIGNER_PICK",  // 👉 (try #2A2000)
  warningBorder: "DESIGNER_PICK",  // 👉 (try #BA7517)
  warningText:   "DESIGNER_PICK",  // 👉 (try #FAC775)
  warningIcon:   "DESIGNER_PICK",  // 👉 (try #EF9F27)

  // --- Semantic: Danger / Error ---------------------------------------------
  dangerBg:      "DESIGNER_PICK",  // 👉 (try #2A0D0D)
  dangerBorder:  "DESIGNER_PICK",  // 👉 (try #A32D2D)
  dangerText:    "DESIGNER_PICK",  // 👉 (try #F09595)
  dangerIcon:    "DESIGNER_PICK",  // 👉 (try #E24B4A)

  // --- Semantic: Info -------------------------------------------------------
  infoBg:        "DESIGNER_PICK",  // 👉 (try #0C2030)
  infoBorder:    "DESIGNER_PICK",  // 👉 (try #185FA5)
  infoText:      "DESIGNER_PICK",  // 👉 (try #85B7EB)
  infoIcon:      "DESIGNER_PICK",  // 👉 (try #35A2CA)

  // --- Form / Input Fields --------------------------------------------------
  inputBg:           "DESIGNER_PICK", // 👉 (try #0F1C22 or surface)
  inputBorder:       "DESIGNER_PICK", // 👉 (try #1E3340)
  inputBorderFocus:  "DESIGNER_PICK", // 👉 (try #35A2CA)
  inputBorderError:  "DESIGNER_PICK", // 👉 same as dangerBorder
  inputPlaceholder:  "DESIGNER_PICK", // 👉 (try #3A6070)
  inputText:         "#E2F0F5",       // ✅ same as text
  inputDisabledBg:   "DESIGNER_PICK", // 👉 (try #111E26)

  // --- Skeleton / Loading ---------------------------------------------------
  skeletonBase:      "DESIGNER_PICK", // 👉 (try #1E3340)
  skeletonHighlight: "DESIGNER_PICK", // 👉 (try #243E4E)

  // --- Misc UI --------------------------------------------------------------
  scrollbar:         "DESIGNER_PICK", // 👉 (try #2A5060)
  shadow:            "DESIGNER_PICK", // 👉 (try "rgba(0,0,0,0.4)")
  badgeText:         "DESIGNER_PICK", // 👉 (try #FFFFFF)
  badgeBg:           "DESIGNER_PICK", // 👉 (try #E24B4A)
};

// ---------------------------------------------------------------------------
// Type export
// ---------------------------------------------------------------------------
export type Theme = typeof lightTheme;
export { lightTheme, darkTheme };
