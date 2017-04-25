/* @flow */

import React, { Component } from 'react'
import {
  WebView,
  StyleSheet,
  View,
} from 'react-native'
import LinkModal from './LinkModal'

import isEqual from 'lodash/isEqual'

const source = require('../../../../lib/zss-rich-text-editor.html')

type Props = {
  onInputChange: (value: string) => void,
  html?: string,
  onLoad?: () => void,
  onFocus?: () => void,
  editorItemsChanged?: (items: [string]) => void,
}

export default class RichTextEditor extends Component<any, Props, any> {
  webView: WebView

  constructor (props: Props) {
    super(props)

    this.state = {
      height: 0,
      linkModalVisible: false,
    }
  }

  render () {
    return (
      <View style={styles.container}>
        <WebView
          source={source}
          ref={webView => { this.webView = webView }}
          onMessage={this._onMessage}
          onLoad={this._onLoad}
          scalesPageToFit={true}
          style={{ height: this.state.height }}
          scrollEnabled={false}
        />
        <LinkModal
          visible={this.state.linkModalVisible}
          url={this.state.linkURL}
          title={this.state.linkTitle}
          linkUpdated={this._updateLink}
          linkCreated={this._insertLink}
          onCancel={this._hideLinkModal}
        />
      </View>
    )
  }

  // PUBLIC ACTIONS

  setBold = () => {
    this._trigger('zss_editor.setBold();', true)
  }

  setItalic = () => {
    this._trigger('zss_editor.setItalic();', true)
  }

  insertLink = () => {
    this._trigger(`
      var selection = getSelection().toString();
      postMessage(JSON.stringify({type: 'INSERT_LINK', data: selection}));
    `)
  }

  prepareInsert = () => {
    this._trigger('zss_editor.prepareInsert();')
  }

  updateHTML = (html: string) => {
    const cleanHTML = this._escapeJSONString(html)
    this._trigger(`zss_editor.setHTML("${cleanHTML}");`, true)
  }

  setCustomCSS = (css?: string) => {
    if (!css) { css = '' }
    const images = 'img { max-width: 100%; }'

    const styles = [images, css].join(' ')

    this._trigger(`zss_editor.setCustomCSS('${styles}');`, true)
  }

  setUnorderedList = () => {
    this._trigger(`zss_editor.setUnorderedList();`, true)
  }

  setOrderedList = () => {
    this._trigger(`zss_editor.setOrderedList();`, true)
  }

  setTextColor = (color: string) => {
    this.prepareInsert()
    this._trigger(`zss_editor.setTextColor('${color}');`, true)
  }

  focusEditor = () => {
    this._trigger('zss_editor.focusEditor();')
  }

  blurEditor = () => {
    this._trigger('zss_editor.blurEditor();')
  }

  updateHeight = () => {
    this._trigger(`
      var height = $('#zss_editor_content').height() + 15
      postMessage(JSON.stringify({type: 'UPDATE_HEIGHT', data: height}));
    `)
  }

  getHTML = () => {
    this._trigger(`setTimeout(function() { zss_editor.postInput() }, 1);`)
  }

  undo = () => {
    this._trigger('zss_editor.undo();')
  }

  redo = () => {
    this._trigger('zss_editor.redo();')
  }

  // PRIVATE

  _trigger = (js: string, inputChanged?: boolean) => {
    this.webView.injectJavaScript(js)
    if (inputChanged) {
      this.getHTML()
    }
  }

  _onMessage = (event) => {
    const message = JSON.parse(event.nativeEvent.data)
    switch (message.type) {
      case 'CALLBACK':
        this._handleItemsCallback(message.data)
        break
      case 'LINK_TOUCHED':
        this._handleLinkTouched(message.data)
        break
      case 'INSERT_LINK':
        this._handleInsertLink(message.data)
        break
      case 'ZSS_LOADED':
        this._onZSSLoaded()
        break
      case 'UPDATE_HEIGHT':
        this._handleHeight(message.data)
        break
      case 'EDITOR_FOCUSED':
        this._handleFocus()
        break
      case 'EDITOR_INPUT':
        this._handleInput(message.data)
        break
    }
  }

  _handleItemsCallback = (items) => {
    if (isEqual(items, this.state.items)) {
      return
    }

    this.setState({ items })

    if (this.props.editorItemsChanged) {
      this.props.editorItemsChanged(items)
    }
  }

  _handleLinkTouched = (link) => {
    this.prepareInsert()
    this._showLinkModal(link.url, link.title)
  }

  _handleInsertLink = (selection) => {
    this.prepareInsert()
    this._showLinkModal(null, selection)
  }

  _handleInput = (value) => {
    this.props.onInputChange(value)
    this.updateHeight()
  }

  _insertLink = (url, title) => {
    this._trigger(`zss_editor.insertLink("${url}", "${title}");`, true)
    this._hideLinkModal()
  }

  _updateLink = (url, title) => {
    this._trigger(`zss_editor.updateLink("${url}", "${title}");`)
    this._hideLinkModal()
  }

  _showLinkModal (url, title) {
    this.setState({
      linkURL: url,
      linkTitle: title,
      linkModalVisible: true,
    })
  }

  _hideLinkModal = () => {
    this.setState({
      linkModalVisible: false,
      linkTitle: null,
      linkURL: null,
    })
    this.focusEditor()
  }

  _onZSSLoaded = () => {
    if (this.props.html) {
      this.updateHTML(this.props.html)
    }
    this.updateHeight()
  }

  _onLoad = () => {
    this._zssInit()
    this.setCustomCSS()
    if (this.props.onLoad) {
      this.props.onLoad()
    }
  }

  _handleHeight = (height) => {
    this.setState({ height })
  }

  _zssInit () {
    this._trigger('zss_editor.init();')
  }

  _handleFocus () {
    if (this.props.onFocus) {
      this.props.onFocus()
    }
  }

  // UTILITIES

  _escapeJSONString (string) {
    return string
      .replace(/[\\]/g, '\\\\')
      .replace(/["]/g, '\\"')
      .replace(/[/]/g, '\\/')
      .replace(/[\b]/g, '\\b')
      .replace(/[\f]/g, '\\f')
      .replace(/[\n]/g, '\\n')
      .replace(/[\r]/g, '\\r')
      .replace(/[\t]/g, '\\t')
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
})
