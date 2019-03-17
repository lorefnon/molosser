import { parse, parseExpression } from "@babel/parser";
import * as t from "@babel/types";
import { isEmpty, uniqueId, castArray } from "lodash";
import template from "@babel/template";

import { ErrorCode } from "../CompilationError";
import * as Pug from "../pug";
import { NodeChildTransformer } from "./NodeChildTransformer";
import { Transformer } from "./Transformer";
import { PugNodeTransformer } from './PugNodeTransformer';
import { FunctionBodyTransformer } from "./FunctionBodyTransformer";

export class CodeNodeTransformer extends Transformer<Pug.CodeNode, t.Node[]> {
    public isExpression = false;
    transform(): void {
        let parsed: t.Node[];
        const parseOpts = {
            sourceType: "module" as "module",
            plugins: ["typescript" as "typescript"],
        };
        let replacements: any = {};
        let content = this.input.val || "";
        if (this.input.block) {
            const blockList = this.delegateTo(PugNodeTransformer, this.input.block);
            const placeholder = uniqueId('MOLOSSER__BLOCK__');
            if (blockList) {
                if (blockList.length > 1) {
                    content += ` ${placeholder};`;
                    replacements[placeholder] = t.blockStatement(this.delegateTo(FunctionBodyTransformer, blockList) || []);
                } else if (blockList.length === 1) {
                    content += ` ${placeholder};`;
                    replacements[placeholder] = blockList[0];
                }
            }
        }
        if (isEmpty(content)) {
            this.output = [];
            return;
        }
        try {
            if (this.isExpression) {
                parsed = [template.expression(content)(replacements)];
            } else {
                parsed = castArray(template(content)(replacements));
            }
            this.output = parsed;
        } catch (e) {
            this.pushError({
                code: ErrorCode.IncorrectSyntaxError,
                isFatal: true,
                maybeBug: false,
                originalError: e,
                ...Pug.extractPosInfo(this.input),
            });
        }
    }
}
