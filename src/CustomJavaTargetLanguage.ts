import { JavaRenderer, JavaTargetLanguage, RenderContext } from "quicktype-core";
import { CustomJavaRenderer } from "./CustomJavaRenderer";

export class CustomJavaTargetLanguage extends JavaTargetLanguage {
    protected makeRenderer(renderContext: RenderContext, untypedOptionValues: { [name: string]: any }): JavaRenderer {
        return new CustomJavaRenderer(this, renderContext, untypedOptionValues);
    }
}