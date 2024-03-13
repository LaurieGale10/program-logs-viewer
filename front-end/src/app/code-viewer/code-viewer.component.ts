import { AfterViewInit, Component, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { python } from "@codemirror/lang-python";
import { StreamLanguage } from "@codemirror/language";
import { diff } from '@codemirror/legacy-modes/mode/diff';

@Component({
  selector: 'app-code-viewer',
  templateUrl: './code-viewer.component.html',
  styleUrls: ['./code-viewer.component.scss']
})
export class CodeViewerComponent implements AfterViewInit, OnChanges {

  @ViewChild('editor') editor: any;

  @Input() codeToDisplay: string | undefined;

  @Input() displayDiffMarkdown: boolean | undefined; //TODO: Need to check when display diffs is pressed as well; rewrite down flow

  editorState: EditorState | undefined;
  editorView: EditorView | undefined;
  editorExtensions: Extension = [basicSetup, EditorState.readOnly.of(true), python()];
  
  ngAfterViewInit(): void {
    let editorNativeElement = this.editor.nativeElement;
    let state!: EditorState;

    try {
      this.editorState = EditorState.create({
        doc: this.codeToDisplay,
        extensions: this.editorExtensions,
      });
    } catch (e) {
      //Please make sure install codemirror@6.0.1
      //If your command was npm install codemirror, will installed 6.65.1(whatever)
      //You will be here.
      console.log("Haven't installed the right version of CodeMirror");
      console.error(e);
    }
    this.editorView = new EditorView({
      state: this.editorState,
      parent: editorNativeElement
    });
  }

  /**
   * Function that updates the code string displayed within the CodeMirror component upon the snapshot code being updated.
   * Done by creating a new EditorState object as editorExtensions changes based on whether the updated code is Python or markdown
   * @param newSnapshotCode The updated code for a snapshot to be displayed within the CodeMirror component
   */
  onSnapshotCodeUpdate(newSnapshotCode: string): void {
    try {
      let editorExtensions = this.displayDiffMarkdown ? [basicSetup, StreamLanguage.define(diff), EditorState.readOnly.of(true)] : this.editorExtensions;
      let newEditorState = EditorState.create({
        doc: newSnapshotCode,
        extensions: editorExtensions,
      });
      this.editorView?.setState(newEditorState);
    }
    catch(e) {
      console.log(e);
      console.log("EditorState could possibly be null") //TODO: Add better error handling here
    }
  }

  /**
   * Function that is called whenever "any data-bound property of the directive changes"
   * Used to detect a change in snapshotCode, which happens when the currentSnapshotData has changed. If the code has changed at all, then update the display of the CodeMirror editor
   * For more info on this function: https://angular.io/api/core/OnChanges
   */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes["codeToDisplay"] != null && !changes["codeToDisplay"]["firstChange"] && changes["codeToDisplay"]["previousValue"] != changes["codeToDisplay"]["currentValue"]) {
      this.onSnapshotCodeUpdate(changes["codeToDisplay"]["currentValue"]);
    }
  }

}
