import * as React from 'react'
import * as ReactDOM from 'react-dom'
import { FixedSizeList } from 'react-window'

/* globals GM */
export default function Explorer (root, hooks) {
  function runHooks (name, ...args) {
    if (!(name in hooks)) {
      return
    }
    if (!Array.isArray(hooks[name])) {
      hooks[name] = [hooks[name]]
    }
    return Promise.all(hooks[name].map(f => f(...args)))
  }

  class AlbumListItem extends React.Component {
    constructor (props) {
      super(props)
      this.state = {
        TralbumData: props.data.library[Object.keys(props.data.library)[props.index]]
      }
    }

    handleAlbumClick = (ev) => {
      const targetStyle = ev.target.style
      targetStyle.cursor = document.body.style.cursor = 'wait'
      const url = this.state.TralbumData.url
      window.setTimeout(function () {
        runHooks('playAlbumFromUrl', url).then(function () {
          targetStyle.cursor = document.body.style.cursor = ''
        })
      }, 1)
    }

    render () {
      return (
        <div className={`albumListItem ${this.props.index % 2 ? 'albumListItemOdd' : ''}`} onClick={this.handleAlbumClick} title='Click to play' style={this.props.style}>
          {this.state.TralbumData.artist} - {this.state.TralbumData.current.title}
        </div>
      )
    }
  }

  class AlbumList extends React.Component {
    constructor (props) {
      super(props)
      this.state = {
        library: {},
        isLoading: false,
        error: null
      }
      if (!this.props.getKey) {
        throw Error('<AlbumList> needs a getKey property')
      }
    }

    componentDidMount () {
      this.setState({ isLoading: true })
      GM.getValue(this.props.getKey, '{}')
        .then(s => JSON.parse(s))
        .then(data => this.setState({ library: data, isLoading: false }))
        .catch(error => this.setState({ error, isLoading: false }))
    }

    render () {
      const { library, isLoading, error } = this.state

      if (error) {
        return <p>{error.message}</p>
      }

      if (isLoading) {
        return <p>Loading ...</p>
      }
      return (
        <FixedSizeList
          className='List'
          height={600}
          itemCount={Object.keys(library).length}
          itemSize={35}
          //width={600}
          itemData={{ library: library }}
        >
          {AlbumListItem}
        </FixedSizeList>
      )
    }
  }

  this.render = function () {
    ReactDOM.render(
      <AlbumList getKey='tralbumlibrary' />,
      root
    )
  }
}
