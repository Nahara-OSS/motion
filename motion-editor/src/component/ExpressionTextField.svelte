<!--
@component
Text field for entering math expression.

The syntax follows Nahara's Motion expression language.
-->

<script lang="ts">
    import * as motion from "@nahara/motion";
    import { getKeyboardHandler } from "../keyboard";
    import Translation from "../util/Translation.svelte";

    const {
        value,
        expect,
        enabled = true,
        onValueChange,
        lookupVariable = () => null,
        lookupReference = () => null,
    }: {
        expect?: motion.value.ValueType<unknown>;
        enabled?: boolean;
        value: string;
        onValueChange: (value: string) => unknown;
        lookupVariable?: (name: string) => motion.value.ValueType<unknown> | null;
        lookupReference?: (name: string) => motion.value.ValueType<unknown> | null;
    } = $props();

    const keyboard = getKeyboardHandler();

    let focused = $state(false);
    let inputBox = $state<HTMLInputElement | null>(null);
    let popover = $state<HTMLDivElement | null>(null);
    let popoverState = $state<string>("closed");
    let caretPos = $state<number | null>(null);

    const expr = $derived(motion.expr.parse(value));
    const selectedExpr = $derived(caretPos != null ? motion.expr.expressionAtPosition(expr, caretPos) : null);
    const evaluated = $derived(evaluateType(expr));
    const evaluatedSelection = $derived(selectedExpr != null ? evaluateType(selectedExpr) : null);

    const error = $derived(
        evaluatedSelection != null && evaluatedSelection.type != "success"
            ? evaluatedSelection
            : evaluated.type != "success"
              ? evaluated
              : null,
    );

    function evaluateType(expr: motion.expr.Expression): motion.value.EvalResult<motion.value.ValueType<unknown>> {
        const result = motion.value.evalType({ expression: expr, lookupVariable, lookupReference });

        if (expect != null && result.type == "success" && result.value != expect) {
            return {
                expression: result.expression,
                type: "eval-error",
                kind: "type-mismatch",
                expect,
                found: result.value,
            };
        }

        return result;
    }

    $effect(() => {
        if (focused) return keyboard.lock();
    });

    $effect(() => {
        const showPopover = focused && (error != null || evaluatedSelection != null);

        if (showPopover && popoverState != "open") {
            popover?.showPopover({ source: inputBox ?? undefined });
        } else if (!showPopover && popoverState == "open") {
            popover?.hidePopover();
        }
    });
</script>

<input
    bind:this={inputBox}
    type="text"
    spellcheck="false"
    class:error={evaluated.type != "success"}
    disabled={!enabled}
    {value}
    oninput={(e) => onValueChange(e.currentTarget.value)}
    onselectionchange={(e) => {
        const { selectionStart } = e.currentTarget;
        caretPos = selectionStart != null ? Math.max(selectionStart - 1, 0) : null;
    }}
    onfocus={() => (focused = true)}
    onblur={() => (focused = false)}
/>

{#snippet functionSignature<T>(of: motion.value.ValueType<T>, signature: motion.value.CallableSignature<T>)}
    <div class="line">
        <span class="type">{of.label}</span>
        <span class="keyword">&nbsp;(</span>
        {#each signature.paramTypes as param, i}
            <span class="type">{param.label}</span>
            {#if i < signature.paramTypes.length - 1}
                <span class="keyword">,</span>
            {/if}
        {/each}
        <span class="keyword">) =>&nbsp;</span>
        <span class="type">{signature.returnType.label}</span>
    </div>
{/snippet}

<div bind:this={popover} class="popover" popover="manual" onbeforetoggle={(e) => (popoverState = e.newState)}>
    <div class="content">
        {#if error != null}
            <div class="error">
                {#if error.type == "expr-error" && error.error == motion.expr.ExpressionError.Empty}
                    <p><Translation key="expression.error.syntax.{error.error}" /></p>
                {:else if error.type == "expr-error"}
                    <p><Translation key="expression.error.syntax.{error.error}" /></p>
                    <pre>{value.substring(error.expression.start, error.expression.end)}</pre>
                {:else}
                    {#if error.kind == "no-variable" || error.kind == "no-reference"}
                        <p><Translation key="expression.error.eval.{error.kind}" slot={[error.name]} /></p>
                    {:else if error.kind == "no-property"}
                        <p>
                            <Translation
                                key="expression.error.eval.{error.kind}"
                                slot={[error.from.label, error.name]}
                            />
                        </p>
                    {:else if error.kind == "not-callable" || error.kind == "no-signature"}
                        <p><Translation key="expression.error.eval.{error.kind}" slot={[error.from.label]} /></p>
                    {:else if error.kind == "type-mismatch"}
                        <p>
                            <Translation
                                key="expression.error.eval.{error.kind}"
                                slot={[error.expect.label, error.found.label]}
                            />
                        </p>
                    {:else if error.kind == "no-binary-operator"}
                        <p>
                            <Translation
                                key="expression.error.eval.{error.kind}"
                                slot={[error.op, error.lhs.label, error.rhs.label]}
                            />
                        </p>
                    {:else if error.kind == "no-unary-operator"}
                        <p>
                            <Translation key="expression.error.eval.{error.kind}" slot={[error.op, error.from.label]} />
                        </p>
                    {:else}
                        <p>
                            Expression error:
                            <Translation key="expression.error.eval.{error.kind}" />
                        </p>
                    {/if}

                    <pre>{value.substring(error.expression.start, error.expression.end)}</pre>

                    {#if error.kind == "type-mismatch"}
                        {#if error.expect == motion.value.NumberType}
                            <p><Translation key="expression.error.eval.{error.kind}.number" /></p>
                            <pre>number("42")</pre>
                        {:else if error.expect == motion.value.StringType}
                            <p><Translation key="expression.error.eval.{error.kind}.string" /></p>
                            <pre>string(42)</pre>
                        {:else if error.expect == motion.value.BooleanType}
                            <p><Translation key="expression.error.eval.{error.kind}.boolean" /></p>
                            <pre>boolean("true")</pre>
                        {:else}
                            <p><Translation key="expression.error.eval.{error.kind}.post" /></p>
                        {/if}
                    {:else if error.kind == "no-reference"}
                        <p><Translation key="expression.error.eval.{error.kind}.post" /></p>
                    {:else if error.kind == "no-signature"}
                        <p><Translation key="expression.error.eval.{error.kind}.post" slot={[error.from.label]} /></p>
                        <div class="code">
                            {#each error.from.callables as signature}
                                {@render functionSignature(error.from, signature)}
                            {/each}
                        </div>
                    {/if}
                {/if}
            </div>
        {/if}
        {#if error != null && evaluatedSelection?.type == "success"}
            <div class="separator"></div>
        {/if}
        {#if evaluatedSelection?.type == "success"}
            <div class="docs">
                <pre><span class="type">{evaluatedSelection.value.label}</span></pre>
                <p>(no documentation)</p>
                {#if evaluatedSelection.value.unaryOps.size > 0}
                    <div class="code">
                        {#each evaluatedSelection.value.unaryOps as [op, sig]}
                            {#if !sig.hideInDocs}
                                <div class="line">
                                    <span class="keyword">{op}</span>
                                    <span class="type">{evaluatedSelection.value.label}</span>
                                    <span class="keyword">&nbsp;=&gt;&nbsp;</span>
                                    <span class="type">{sig.type.label}</span>
                                </div>
                            {/if}
                        {/each}
                        {#if [...evaluatedSelection.value.unaryOps.values()].some((v) => v.hideInDocs)}
                            <span class="comment">(some unary operators are hidden)</span>
                        {/if}
                    </div>
                {/if}
                {#if evaluatedSelection.value.binaryOps.size > 0}
                    <div class="code">
                        {#each evaluatedSelection.value.binaryOps as [op, map]}
                            {#each map as [rhs, sig]}
                                {#if !sig.hideInDocs}
                                    <div class="line">
                                        <span class="type">{evaluatedSelection.value.label}</span>
                                        <span class="keyword">&nbsp;{op}&nbsp;</span>
                                        <span class="type">{rhs.label}</span>
                                        <span class="keyword">&nbsp;=&gt;&nbsp;</span>
                                        <span class="type">{sig.type.label}</span>
                                    </div>
                                {/if}
                            {/each}
                        {/each}
                        {#if [...evaluatedSelection.value.binaryOps.values()].some( (v) => [...v.values()].some((v) => v.hideInDocs), )}
                            <span class="comment">(some binary operators are hidden)</span>
                        {/if}
                    </div>
                {/if}
                {#if evaluatedSelection.value.properties.size > 0}
                    <div class="code">
                        {#each evaluatedSelection.value.properties as property}
                            {#if !property[1].hideInDocs}
                                <div class="line">
                                    <span class="type">{evaluatedSelection.value.label}</span>
                                    <span class="keyword">.</span>
                                    <span class="property">{property[0]}</span>
                                    <span class="keyword">&nbsp;=&gt;&nbsp;</span>
                                    <span class="type">{property[1].type.label}</span>
                                </div>
                            {/if}
                        {/each}
                        {#if [...evaluatedSelection.value.properties.values()].some((v) => v.hideInDocs)}
                            <span class="comment">(some properties are hidden)</span>
                        {/if}
                    </div>
                {/if}
                {#if evaluatedSelection.value.callables.length > 0}
                    <div class="code">
                        {#each evaluatedSelection.value.callables as signature}
                            {#if !signature.hideInDocs}
                                {@render functionSignature(evaluatedSelection.value, signature)}
                            {/if}
                        {/each}
                        {#if [...evaluatedSelection.value.callables.values()].some((v) => v.hideInDocs)}
                            <span class="comment">(some function signatures are hidden)</span>
                        {/if}
                    </div>
                {/if}
            </div>
        {/if}
    </div>
</div>

<style>
    input {
        appearance: none;
        -webkit-appearance: none;
        font-family: Ligconsolata, Inconsolata, Consolas, monospace;
        font-size: inherit;
        color: inherit;
        outline: none;
        padding-block: 0.2rem;
        padding-inline: 0.6rem;
        border: 1px solid #9f9f9f;
        background-color: transparent;
        height: 2rem;
        box-sizing: border-box;

        &:hover {
            border-color: #7f7f7f;
            background-color: #efefef;
        }

        &:active {
            border-color: #3f3f3f;
            background-color: #e7e7e7;
        }

        &:disabled {
            color: #9f9f9f;
            border-color: #dfdfdf;
            background-color: #ffffff;
        }

        /* &.info {
            border-color: #4fc1ff;
            color: #002d4c;
        }

        &.warn {
            border-color: #ffbc4f;
            background-color: #fff4e0;
            color: #4c2500;
        } */

        &.error {
            border-color: #ff4f4f;
            background-color: #ffe0e0;
            color: #4c0000;
        }
    }

    .popover {
        margin: 0;
        position-area: bottom span-right;
        padding: 0;
        border: 0;
        box-shadow: 0 0 12px #0000000f;

        > .content {
            display: flex;
            flex-direction: column;
            border: 1px solid #9f9f9f;
            box-sizing: border-box;
            background-color: #ffffff;

            > .separator {
                background-color: #dfdfdf;
                height: 1px;
            }

            > .error {
                background-color: #ffe0e0;
                color: #4c0000;
            }

            pre,
            p,
            .code {
                padding-inline: 0.6rem;
                padding-block: 0.5rem;
                margin: 0;
                box-sizing: border-box;
            }

            pre,
            .code {
                font-family: Ligconsolata, Inconsolata, Consolas, monospace;
                font-size: 12px;

                span.keyword {
                    font-weight: bold;
                }

                span.type {
                    color: #006d10;
                }

                span.comment {
                    color: #7f7f7f;
                }
            }

            .code {
                display: flex;
                flex-direction: column;

                > .line {
                    display: flex;
                    flex-direction: row;

                    > span {
                        white-space: pre;
                    }
                }
            }
        }
    }
</style>
