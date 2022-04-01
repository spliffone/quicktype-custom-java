import { assertNever, ClassProperty, ClassType, JavaRenderer, Name, RenderContext, Sourcelike, TargetLanguage, UnionType } from "quicktype-core";
import { anyTypeIssueAnnotation, nullTypeIssueAnnotation } from "quicktype-core/dist/Annotation";
import { javaOptions, stringEscape } from "quicktype-core/dist/language/Java";
import { getOptionValues, Option, OptionValues } from "quicktype-core/dist/RendererOptions";
import { maybeAnnotated } from "quicktype-core/dist/Source";
import { EnumType, Type } from "quicktype-core/dist/Type";
import { matchType, nullableFromUnion } from "quicktype-core/dist/TypeUtils";

export class CustomJavaRenderer extends JavaRenderer {
    options: OptionValues<typeof javaOptions>

    constructor(
        targetLanguage: TargetLanguage,
        renderContext: RenderContext,
        untypedOptionValues: { [name: string]: any },
    ) {
        super(targetLanguage, renderContext, getOptionValues(javaOptions, untypedOptionValues));
        this.options = getOptionValues(javaOptions, untypedOptionValues);
    }

    protected getOptions(): Option<any>[] {
        return [
        ];
    }

    protected readonly _converterKeywords: string[] = [
        "JsonProperty",
        "JsonDeserialize",
        "JsonDeserializer",
        "JsonSerialize",
        "JsonSerializer",
        "JsonParser",
        "JsonProcessingException",
        "DeserializationContext",
        "SerializerProvider",
    ];

    protected emitClassAttributes(c: ClassType, _className: Name): void {
        
        this.emitLine("@Data");
        this.emitLine("@Builder");
        this.emitLine("@NoArgsConstructor");
        this.emitLine("@AllArgsConstructor");
        this.emitLine("@JsonInclude(JsonInclude.Include.NON_NULL)");

        super.emitClassAttributes(c, _className);
    }

    protected annotationsForAccessor(
        _c: ClassType,
        _className: Name,
        _propertyName: Name,
        jsonName: string,
        p: ClassProperty,
        _isSetter: boolean
    ): string[] {
        
        const annotations: string[] = [
            ('@JsonProperty("' + stringEscape(jsonName) + '")')
        ];

        switch (p.type.kind) {
            case "date-time":
                //this._dateTimeProvider.dateTimeJacksonAnnotations.forEach(annotation => annotations.push(annotation));
                break;
            case "date":
                //this._dateTimeProvider.dateJacksonAnnotations.forEach(annotation => annotations.push(annotation));
                break;
            case "time":
                //this._dateTimeProvider.timeJacksonAnnotations.forEach(annotation => annotations.push(annotation));
                break;
            default:
                break;
        }

        return [...annotations];
    }

    protected importsForType(t: ClassType | UnionType | EnumType): string[] {
        if (t instanceof ClassType) {
            const imports = super.importsForType(t);
            imports.push("lombok.*");
            return imports;
        }
        if (t instanceof UnionType) {
            const imports = super.importsForType(t);
            imports.push("java.io.IOException",
                "com.fasterxml.jackson.core.*",
                "com.fasterxml.jackson.databind.*",
                "com.fasterxml.jackson.databind.annotation.*"
            );
            /*if (this._options.useList) {
                imports.push("com.fasterxml.jackson.core.type.*");
            }*/
            return imports;
        }
        if (t instanceof EnumType) {
            const imports = super.importsForType(t);
            imports.push("com.fasterxml.jackson.annotation.*");
            return imports;
        }
        return assertNever(t);
    }

    protected javaImport(t: Type): string[] {
        return matchType<string[]>(
            t,
            (_anyType) => [],
            (_nullType) => [],
            (_boolType) => [],
            (_integerType) => [],
            (_doubleType) => [],
            (_stringType) => [],
            (arrayType) => {
                return [...this.javaImport(arrayType.items), "java.util.List"];
            },
            (_classType) => [],
            (mapType) => [...this.javaImport(mapType.values), "java.util.Map"],
            (_enumType) => [],
            (unionType) => {
                const imports: string[] = [];
                unionType.members.forEach((type) => this.javaImport(type).forEach((imp) => imports.push(imp)));
                return imports;
            },
            (transformedStringType) => {
                if (transformedStringType.kind === "time") {
                    return ["java.time.OffsetTime"];
                }
                if (transformedStringType.kind === "date") {
                    return ["java.time.LocalDate"];
                }
                if (transformedStringType.kind === "date-time") {
                    return ["java.time.OffsetDateTime"];
                }
                if (transformedStringType.kind === "uuid") {
                    return ["java.util.UUID"];
                }
                return [];
            }
        );
    }
    
    protected importsForClass(c: ClassType): string[] {
        const imports: string[] = [];
        this.forEachClassProperty(c, "none", (_name, _jsonName, p) => {
            this.javaImport(p.type).forEach((imp) => imports.push(imp));
        });
        imports.sort();
        return [...new Set(imports)];
    }

    protected emitClassDefinition(c: ClassType, className: Name): void {
        let imports = [...this.importsForType(c), ...this.importsForClass(c)];

        this.emitFileHeader(className, imports);
        this.emitDescription(this.descriptionForType(c));
        this.emitClassAttributes(c, className);
        this.emitBlock(["public class ", className], () => {
            this.forEachClassProperty(c, "none", (name, jsonName, p) => {
                
                this.annotationsForAccessor(c, className, name, jsonName, p, false)
                        .forEach(annotation => this.emitLine(annotation));
                this.emitLine("private ", this.javaType(false, p.type, true), " ", name, ";");
            });
        });
        this.finishFile();
    }

    public emitTryCatch(main: () => void, handler: () => void, exception: string = "Exception") {
        this.emitLine("try {");
        this.indent(main);
        this.emitLine("} catch (", exception, " ex) {");
        this.indent(handler);
        this.emitLine("}");
    }

    public emitIgnoredTryCatchBlock(f: () => void) {
        this.emitTryCatch(f, () => this.emitLine("// Ignored"));
    }

    protected emitSourceStructure(): void {
        super.emitSourceStructure();
    }

    protected javaType(reference: boolean, t: Type, withIssues: boolean = false): Sourcelike {
        return matchType<Sourcelike>(
            t,
            (_anyType) => maybeAnnotated(withIssues, anyTypeIssueAnnotation, "Object"),
            (_nullType) => maybeAnnotated(withIssues, nullTypeIssueAnnotation, "Object"),
            (_boolType) => (reference ? "Boolean" : "boolean"),
            (_integerType) => (reference ? "Long" : "long"),
            (_doubleType) => (reference ? "Double" : "double"),
            (_stringType) => "String",
            (arrayType) => {
                return ["List<", this.javaType(true, arrayType.items, withIssues), ">"];

            },
            (classType) => this.nameForNamedType(classType),
            (mapType) => ["Map<String, ", this.javaType(true, mapType.values, withIssues), ">"],
            (enumType) => this.nameForNamedType(enumType),
            (unionType) => {
                const nullable = nullableFromUnion(unionType);
                if (nullable !== null) return this.javaType(true, nullable, withIssues);
                return this.nameForNamedType(unionType);
            },
            (transformedStringType) => {
                if (transformedStringType.kind === "time") {
                    return "OffsetTime";
                }
                if (transformedStringType.kind === "date") {
                    return "LocalDate";
                }
                if (transformedStringType.kind === "date-time") {
                    return "OffsetDateTime";
                }
                if (transformedStringType.kind === "uuid") {
                    return "UUID";
                }
                return "String";
            }
        );
    }
}