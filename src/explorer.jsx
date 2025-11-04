import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { List } from 'react-window'

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

  const AlbumListComponent = React.memo(function AlbumListComponent ({ index, style, library }) {
    const tralbum = library[Object.keys(library)[index]]

    const handleAlbumClick = React.useCallback((ev) => {
      const targetStyle = ev.target.style
      targetStyle.cursor = document.body.style.cursor = 'wait'
      const url = tralbum.url
      window.setTimeout(() => {
        runHooks('playAlbumFromUrl', url).then(() => {
          targetStyle.cursor = document.body.style.cursor = ''
        })
      }, 1)
    }, [tralbum])

    const handleContextMenu = React.useCallback((ev) => {
      ev.preventDefault()
      ev.target.classList.add('selected')

      const url = tralbum.url
      if (!window.confirm(`Delete album "${tralbum.current.title}" by ${tralbum.artist}?`)) {
        ev.target.classList.remove('selected')
        return
      }

      window.setTimeout(() => {
        runHooks('deletePermanentTralbum', url).then(() => {
          ev.target.classList.remove('selected')
          ev.target.style.visibility = 'hidden'
        })
      }, 1)
    }, [tralbum])

    return (
      <div
        className={`albumListItem ${index % 2 ? 'albumListItemOdd' : ''}`}
        onClick={handleAlbumClick}
        onContextMenu={handleContextMenu}
        title='Click to play'
        style={style}
      >
        {tralbum.artist} - {tralbum.current.title}
      </div>
    )
  })

  class AlbumList extends React.Component {
    constructor (props) {
      super(props)
      this.state = { library: {}, isLoading: false, error: null }
      if (!this.props.getKey) throw Error('<AlbumList> needs a getKey property')
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
      if (error) return <p>{error.message}</p>
      if (isLoading) return <p>Loading ...</p>

      const rowCount = Object.keys(library).length

      return (
        <List
          className='List'
          height={600}
          rowCount={rowCount}
          rowHeight={35}
          rowComponent={AlbumListComponent}
          rowProps={{ library }} // passes to each row
        />
      )
    }
  }

  this.render = function () {
    createRoot(root).render(<AlbumList getKey='tralbumlibrary' />)
  }
}
