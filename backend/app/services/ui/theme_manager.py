from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any
import json
import os
from pathlib import Path

class ColorScheme(Enum):
    LIGHT = "light"
    DARK = "dark"

@dataclass
class ColorPalette:
    primary: str
    secondary: str
    accent: str
    background: str
    text: str
    error: str
    warning: str
    success: str
    info: str

@dataclass
class Typography:
    font_family: str
    font_size_base: str
    line_height_base: str
    headings: Dict[str, Dict[str, str]]
    body: Dict[str, str]

@dataclass
class Spacing:
    unit: str
    scale: List[str]
    custom: Dict[str, str]

@dataclass
class Breakpoints:
    xs: str
    sm: str
    md: str
    lg: str
    xl: str
    xxl: str

@dataclass
class Theme:
    name: str
    color_schemes: Dict[ColorScheme, ColorPalette]
    typography: Typography
    spacing: Spacing
    breakpoints: Breakpoints
    custom: Dict[str, Any]

class ThemeManager:
    def __init__(self, themes_dir: str):
        self.themes_dir = Path(themes_dir)
        self.themes_dir.mkdir(parents=True, exist_ok=True)
        self._load_themes()

    def _load_themes(self):
        """Load all themes from the themes directory"""
        self.themes = {}
        for theme_file in self.themes_dir.glob("*.json"):
            with open(theme_file, "r") as f:
                theme_data = json.load(f)
                self.themes[theme_data["name"]] = self._parse_theme(theme_data)

    def _parse_theme(self, theme_data: Dict[str, Any]) -> Theme:
        """Parse theme data into Theme object"""
        color_schemes = {
            ColorScheme(scheme): ColorPalette(**colors)
            for scheme, colors in theme_data["color_schemes"].items()
        }

        typography = Typography(
            font_family=theme_data["typography"]["font_family"],
            font_size_base=theme_data["typography"]["font_size_base"],
            line_height_base=theme_data["typography"]["line_height_base"],
            headings=theme_data["typography"]["headings"],
            body=theme_data["typography"]["body"]
        )

        spacing = Spacing(
            unit=theme_data["spacing"]["unit"],
            scale=theme_data["spacing"]["scale"],
            custom=theme_data["spacing"]["custom"]
        )

        breakpoints = Breakpoints(**theme_data["breakpoints"])

        return Theme(
            name=theme_data["name"],
            color_schemes=color_schemes,
            typography=typography,
            spacing=spacing,
            breakpoints=breakpoints,
            custom=theme_data.get("custom", {})
        )

    def create_theme(self, theme_data: Dict[str, Any]) -> Theme:
        """Create a new theme"""
        theme = self._parse_theme(theme_data)
        
        # Save theme to file
        theme_file = self.themes_dir / f"{theme.name}.json"
        with open(theme_file, "w") as f:
            json.dump(theme_data, f, indent=2)
        
        self.themes[theme.name] = theme
        return theme

    def get_theme(self, name: str) -> Optional[Theme]:
        """Get theme by name"""
        return self.themes.get(name)

    def update_theme(self, name: str, theme_data: Dict[str, Any]) -> Theme:
        """Update existing theme"""
        if name not in self.themes:
            raise ValueError(f"Theme '{name}' not found")
        
        theme = self._parse_theme(theme_data)
        
        # Update theme file
        theme_file = self.themes_dir / f"{name}.json"
        with open(theme_file, "w") as f:
            json.dump(theme_data, f, indent=2)
        
        self.themes[name] = theme
        return theme

    def delete_theme(self, name: str):
        """Delete theme"""
        if name not in self.themes:
            raise ValueError(f"Theme '{name}' not found")
        
        theme_file = self.themes_dir / f"{name}.json"
        theme_file.unlink()
        del self.themes[name]

    def export_theme(self, name: str, format: str = "css") -> str:
        """Export theme in specified format"""
        theme = self.get_theme(name)
        if not theme:
            raise ValueError(f"Theme '{name}' not found")

        if format == "css":
            return self._export_css(theme)
        elif format == "scss":
            return self._export_scss(theme)
        else:
            raise ValueError(f"Unsupported format: {format}")

    def _export_css(self, theme: Theme) -> str:
        """Export theme as CSS variables"""
        css = []
        
        # Root variables
        css.append(":root {")
        
        # Colors
        for scheme, palette in theme.color_schemes.items():
            for color_name, color_value in palette.__dict__.items():
                css.append(f"  --color-{scheme.value}-{color_name}: {color_value};")
        
        # Typography
        css.append(f"  --font-family: {theme.typography.font_family};")
        css.append(f"  --font-size-base: {theme.typography.font_size_base};")
        css.append(f"  --line-height-base: {theme.typography.line_height_base};")
        
        for heading, props in theme.typography.headings.items():
            for prop_name, prop_value in props.items():
                css.append(f"  --typography-{heading}-{prop_name}: {prop_value};")
        
        # Spacing
        css.append(f"  --spacing-unit: {theme.spacing.unit};")
        for i, value in enumerate(theme.spacing.scale):
            css.append(f"  --spacing-{i}: {value};")
        
        # Breakpoints
        for breakpoint, value in theme.breakpoints.__dict__.items():
            css.append(f"  --breakpoint-{breakpoint}: {value};")
        
        css.append("}")
        
        return "\n".join(css)

    def _export_scss(self, theme: Theme) -> str:
        """Export theme as SCSS variables"""
        scss = []
        
        # Colors
        for scheme, palette in theme.color_schemes.items():
            for color_name, color_value in palette.__dict__.items():
                scss.append(f"$color-{scheme.value}-{color_name}: {color_value};")
        
        # Typography
        scss.append(f"$font-family: {theme.typography.font_family};")
        scss.append(f"$font-size-base: {theme.typography.font_size_base};")
        scss.append(f"$line-height-base: {theme.typography.line_height_base};")
        
        scss.append("$typography: (")
        for heading, props in theme.typography.headings.items():
            scss.append(f"  {heading}: (")
            for prop_name, prop_value in props.items():
                scss.append(f"    {prop_name}: {prop_value},")
            scss.append("  ),")
        scss.append(");")
        
        # Spacing
        scss.append(f"$spacing-unit: {theme.spacing.unit};")
        scss.append("$spacing: (")
        for i, value in enumerate(theme.spacing.scale):
            scss.append(f"  {i}: {value},")
        scss.append(");")
        
        # Breakpoints
        scss.append("$breakpoints: (")
        for breakpoint, value in theme.breakpoints.__dict__.items():
            scss.append(f"  {breakpoint}: {value},")
        scss.append(");")
        
        return "\n".join(scss)
