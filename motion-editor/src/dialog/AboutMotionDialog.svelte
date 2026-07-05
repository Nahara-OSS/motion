<script lang="ts">
    import Button from "../component/Button.svelte";
    import Dialog from "../component/Dialog.svelte";
    import TextLabel from "../component/TextLabel.svelte";

    const { onDismiss }: { onDismiss: () => unknown } = $props();
</script>

<Dialog {onDismiss}>
    {#snippet label()}
        <TextLabel>About Nahara's Motion</TextLabel>
    {/snippet}
    <div class="content">
        <h1>Nahara's Motion</h1>
        <p><i>Shape your world with motion graphics.</i></p>
        <p>Nahara's Motion &copy; 2026 by Nahara's Motion Contributors.</p>
        <Button onClick={() => open("https://github.com/Nahara-OSS/motion", "_blank")}>
            <TextLabel>Source code</TextLabel>
        </Button>
        <div class="split">
            <div class="section">
                <h2>Nahara's Motion Editor</h2>
                <p>
                    This program is free software: you can redistribute it and/or modify it under the terms of the GNU
                    General Public License as published by the Free Software Foundation, either version 3 of the
                    License, or (at your option) any later version.
                </p>
                <p>
                    This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without
                    even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
                    General Public License for more details.
                </p>
                <p>
                    For more information about GNU General Public License version 3, see
                    https://www.gnu.org/licenses/gpl-3.0.html.
                </p>
            </div>
            <div class="section">
                <h2>Nahara's Motion Engine</h2>
                <p>
                    Nahara's Motion Engine, which is the heart of Nahara's Motion, is licensed under permissive license,
                    typically known as "The MIT License".
                </p>
                <p>
                    THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
                    NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
                    NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES
                    OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
                    CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
                </p>
            </div>
            <div class="section">
                <h2>Third party components</h2>
                <p>
                    Click "Third party licenses" button to view the full list of all software components and the
                    licenses.
                </p>
                <Button>
                    <TextLabel>Third party licenses</TextLabel>
                </Button>
            </div>
        </div>
    </div>
</Dialog>

<style>
    .content {
        padding: 1.1rem;
        width: 90rem;

        > .split {
            display: flex;
            flex-direction: row;
            gap: 2rem;

            > .section {
                width: 0;
                flex-grow: 1;
            }
        }
    }
</style>
