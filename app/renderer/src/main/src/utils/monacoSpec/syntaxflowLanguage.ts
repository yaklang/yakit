import { CancellationToken, editor, languages, Position } from "monaco-editor";
import { SyntaxFlowMonacoSpec } from "./syntaxflowEditor";
import { YaklangLanguageSuggestionRequest, Range, YaklangLanguageSuggestionResponse, getCompletionItemKindByName, getSortTextByKindAndLabel } from "./yakCompletionSchema";
import { monaco } from "react-monaco-editor";
import { before } from "lodash";
const { ipcRenderer } = window.require("electron");

export const newSyntaxflowCompletionHandlerProvider = (model: editor.ITextModel, position: Position, context: languages.CompletionContext, token: CancellationToken): Promise<{ incomplete: boolean, suggestions: languages.CompletionItem[] }> => {
    return new Promise(async (resolve, reject) => {
        if (position === undefined) {
            resolve({ incomplete: false, suggestions: [] });
            return
        }
        const { column, lineNumber } = position;
        if (column === undefined || lineNumber === undefined) {
            resolve({ incomplete: false, suggestions: [] });
            return
        }

        if ((position?.column || 0) <= 0) {
            resolve({ incomplete: false, suggestions: [] });
            return
        }
        const rng = getSyntaxflowCompletionPosition(model, position);

        await ipcRenderer.invoke("YaklangLanguageSuggestion", {
            InspectType: "completion",
            YakScriptType: SyntaxFlowMonacoSpec,
            YakScriptCode: model.getValue(),
            ModelID: model.id,
            Range: rng,
        } as YaklangLanguageSuggestionRequest).then((r: YaklangLanguageSuggestionResponse) => {
            if (r.SuggestionMessage.length > 0) {
                let range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: rng.StartColumn,
                    endColumn: rng.EndColumn,
                }
                let suggestions = r.SuggestionMessage.map(i => {
                    let item =  {
                        insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        insertText: i.InsertText,
                        kind: getCompletionItemKindByName(i.Kind),
                        label: i.Label,
                        detail: i.DefinitionVerbose,
                        documentation: { value: i.Description, isTrusted: true },
                        range: range,
                        sortText: getSortTextByKindAndLabel(i.Kind, i.Label),
                        // command: { id: i.Command, title: "Command" },
                    } as languages.CompletionItem
                    if (i.Command != "") {
                        item.command = { id: i.Command, title: "Command" }
                    }
                    return item 
                })


                resolve({
                    incomplete: false,
                    suggestions: suggestions,
                });
            }
            resolve({ incomplete: false, suggestions: [] });
        })
    })
}

const getSyntaxflowCompletionPosition = (model: editor.ITextModel, position: Position): Range => {

    // syntaxflow_library_name
    let word = model.getWordAtPosition(position)
    // console.log(" position: ", position, "word: ", word);
    if (word == undefined) {
        word = { word: "", startColumn: position.column, endColumn: position.column, } as monaco.editor.IWordAtPosition
    }
    let range = new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn)
    // console.log("range : ", range, model.getValueInRange(range));


    const line = model.getLineContent(position.lineNumber)
    const beforePosition = line.slice(0, word.startColumn - 1)
    // console.log("beforePosition: ", beforePosition);


    // this range just for monaco completion range 
    let rng = {
            Code: "",
            StartColumn: word.startColumn ,
            EndColumn: word.endColumn,
            StartLine: position.lineNumber,
            EndLine: position.lineNumber,
    } as Range

    // backend only support "<" and "<include("
    if (beforePosition.endsWith("<")) {
        rng.Code = "<"
    }
    if (beforePosition.endsWith("<include(")) {
            rng.Code =  "<include("
    }

    return rng
}


