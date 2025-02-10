from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional, Any
import json

class UIFramework(Enum):
    REACT = "react"
    VUE = "vue"
    SVELTE = "svelte"
    NEXTJS = "nextjs"

@dataclass
class ComponentDefinition:
    name: str
    props: Dict[str, Any]
    children: List['ComponentDefinition']
    styles: Dict[str, Any]
    framework_specific: Dict[str, Any]

class FrameworkAdapter(ABC):
    @abstractmethod
    def generate_component(self, definition: ComponentDefinition) -> str:
        """Generate framework-specific component code"""
        pass

    @abstractmethod
    def generate_styles(self, styles: Dict[str, Any]) -> str:
        """Generate framework-specific styles"""
        pass

    @abstractmethod
    def generate_props(self, props: Dict[str, Any]) -> str:
        """Generate framework-specific props"""
        pass

class ReactAdapter(FrameworkAdapter):
    def generate_component(self, definition: ComponentDefinition) -> str:
        props = self.generate_props(definition.props)
        styles = self.generate_styles(definition.styles)
        children = [
            self.generate_component(child)
            for child in definition.children
        ]

        return f"""
import React from 'react';
import styled from 'styled-components';

const Styled{definition.name} = styled.div`
    {styles}
`;

export const {definition.name} = ({props}) => {{
    return (
        <Styled{definition.name} {...props}>
            {{"".join(children)}}
        </Styled{definition.name}>
    );
}};
"""

    def generate_styles(self, styles: Dict[str, Any]) -> str:
        css_rules = []
        for prop, value in styles.items():
            css_rules.append(f"{prop}: {value};")
        return "\n    ".join(css_rules)

    def generate_props(self, props: Dict[str, Any]) -> str:
        prop_list = []
        for name, type_info in props.items():
            prop_list.append(f"{name}: {type_info}")
        return "{ " + ", ".join(prop_list) + " }"

class VueAdapter(FrameworkAdapter):
    def generate_component(self, definition: ComponentDefinition) -> str:
        props = self.generate_props(definition.props)
        styles = self.generate_styles(definition.styles)
        children = [
            self.generate_component(child)
            for child in definition.children
        ]

        return f"""
<template>
    <div class="{definition.name.lower()}">
        {"".join(children)}
    </div>
</template>

<script>
export default {{
    name: '{definition.name}',
    props: {props}
}}
</script>

<style scoped>
.{definition.name.lower()} {{
    {styles}
}}
</style>
"""

    def generate_styles(self, styles: Dict[str, Any]) -> str:
        css_rules = []
        for prop, value in styles.items():
            css_rules.append(f"    {prop}: {value};")
        return "\n".join(css_rules)

    def generate_props(self, props: Dict[str, Any]) -> str:
        prop_list = []
        for name, type_info in props.items():
            prop_list.append(f"    {name}: {{ type: {type_info} }}")
        return "{\n" + ",\n".join(prop_list) + "\n}"

class SvelteAdapter(FrameworkAdapter):
    def generate_component(self, definition: ComponentDefinition) -> str:
        props = self.generate_props(definition.props)
        styles = self.generate_styles(definition.styles)
        children = [
            self.generate_component(child)
            for child in definition.children
        ]

        return f"""
<script>
    {props}
</script>

<div class="{definition.name.lower()}">
    {"".join(children)}
</div>

<style>
    .{definition.name.lower()} {{
        {styles}
    }}
</style>
"""

    def generate_styles(self, styles: Dict[str, Any]) -> str:
        css_rules = []
        for prop, value in styles.items():
            css_rules.append(f"        {prop}: {value};")
        return "\n".join(css_rules)

    def generate_props(self, props: Dict[str, Any]) -> str:
        prop_list = []
        for name, type_info in props.items():
            prop_list.append(f"export let {name};")
        return "\n    ".join(prop_list)

class NextJSAdapter(FrameworkAdapter):
    def generate_component(self, definition: ComponentDefinition) -> str:
        props = self.generate_props(definition.props)
        styles = self.generate_styles(definition.styles)
        children = [
            self.generate_component(child)
            for child in definition.children
        ]

        return f"""
'use client';

import styled from 'styled-components';

const Styled{definition.name} = styled.div`
    {styles}
`;

export default function {definition.name}({props}) {{
    return (
        <Styled{definition.name}>
            {{"".join(children)}}
        </Styled{definition.name}>
    );
}}
"""

    def generate_styles(self, styles: Dict[str, Any]) -> str:
        css_rules = []
        for prop, value in styles.items():
            css_rules.append(f"    {prop}: {value};")
        return "\n".join(css_rules)

    def generate_props(self, props: Dict[str, Any]) -> str:
        prop_list = []
        for name, type_info in props.items():
            prop_list.append(f"{name}")
        return "{ " + ", ".join(prop_list) + " }"

class UIGenerator:
    def __init__(self):
        self.adapters = {
            UIFramework.REACT: ReactAdapter(),
            UIFramework.VUE: VueAdapter(),
            UIFramework.SVELTE: SvelteAdapter(),
            UIFramework.NEXTJS: NextJSAdapter()
        }

    def generate_component(
        self,
        definition: ComponentDefinition,
        framework: UIFramework
    ) -> str:
        """Generate component code for specified framework"""
        adapter = self.adapters.get(framework)
        if not adapter:
            raise ValueError(f"Unsupported framework: {framework}")
        return adapter.generate_component(definition)

    def generate_project_structure(
        self,
        components: List[ComponentDefinition],
        framework: UIFramework,
        output_dir: str
    ) -> Dict[str, str]:
        """Generate all project files for specified framework"""
        files = {}
        
        # Generate components
        for component in components:
            code = self.generate_component(component, framework)
            filename = f"{component.name}.{self._get_extension(framework)}"
            files[filename] = code

        # Generate framework-specific config files
        config_files = self._generate_config_files(framework)
        files.update(config_files)

        return files

    def _get_extension(self, framework: UIFramework) -> str:
        """Get file extension for framework"""
        extensions = {
            UIFramework.REACT: "tsx",
            UIFramework.VUE: "vue",
            UIFramework.SVELTE: "svelte",
            UIFramework.NEXTJS: "tsx"
        }
        return extensions.get(framework, "tsx")

    def _generate_config_files(self, framework: UIFramework) -> Dict[str, str]:
        """Generate framework-specific configuration files"""
        configs = {}
        
        if framework == UIFramework.REACT:
            configs["tsconfig.json"] = json.dumps({
                "compilerOptions": {
                    "target": "es5",
                    "lib": ["dom", "dom.iterable", "esnext"],
                    "allowJs": True,
                    "skipLibCheck": True,
                    "esModuleInterop": True,
                    "allowSyntheticDefaultImports": True,
                    "strict": True,
                    "forceConsistentCasingInFileNames": True,
                    "module": "esnext",
                    "moduleResolution": "node",
                    "resolveJsonModule": True,
                    "isolatedModules": True,
                    "noEmit": True,
                    "jsx": "react-jsx"
                },
                "include": ["src"],
                "exclude": ["node_modules"]
            }, indent=2)

        elif framework == UIFramework.VUE:
            configs["vue.config.js"] = """
module.exports = {
    configureWebpack: {
        // Vue.js specific configuration
    }
}
"""

        elif framework == UIFramework.SVELTE:
            configs["svelte.config.js"] = """
import adapter from '@sveltejs/adapter-auto';

export default {
    kit: {
        adapter: adapter()
    }
};
"""

        elif framework == UIFramework.NEXTJS:
            configs["next.config.js"] = """
/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compiler: {
        styledComponents: true
    }
}

module.exports = nextConfig
"""

        return configs
