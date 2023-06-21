import React from "react";
import monaco from "monaco-editor";

export const MONACO_SPEC_WEBFUZZER_REQUEST = "webfuzzer-request";

monaco.languages.register({id: MONACO_SPEC_WEBFUZZER_REQUEST});
monaco.languages.setTokensProvider(MONACO_SPEC_WEBFUZZER_REQUEST, {
    tokenize: (line: string, state) => {
        return {endState: {}, tokens: []} as any;
    },
    getInitialState: () => {
        return {} as any;
    }
})