// ==UserScript==
// @name            Bandcamp script (Deluxe Edition)
// @description     A discography player for bandcamp.com and manager for your played albums
// @namespace       https://openuserjs.org/users/cuzi
// @supportURL      https://github.com/cvzi/Bandcamp-script-deluxe-edition/issues
// @icon            https://raw.githubusercontent.com/cvzi/Bandcamp-script-deluxe-edition/master/images/icon.png
// @contributionURL https://github.com/cvzi/Bandcamp-script-deluxe-edition#donate
// @require         https://unpkg.com/json5@2.1.0/dist/index.min.js
// @require         https://openuserjs.org/src/libs/cuzi/GeniusLyrics.js
// @require         https://unpkg.com/react@18/umd/react.development.js
// @require         https://unpkg.com/react-dom@18/umd/react-dom.development.js
// @run-at          document-start
// @match           https://*/*
// @match           https://bandcamp.com/*
// @exclude         https://bandcamp.com/videoframe*
// @exclude         https://bandcamp.com/EmbeddedPlayer*
// @connect         bandcamp.com
// @connect         *.bandcamp.com
// @connect         bcbits.com
// @connect         *.bcbits.com
// @connect         genius.com
// @connect         *
// @version         1.28.0
// @homepage        https://github.com/cvzi/Bandcamp-script-deluxe-edition
// @author          cuzi
// @license         MIT
// @grant           GM.xmlHttpRequest
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.notification
// @grant           GM_download
// @grant           GM.registerMenuCommand
// @grant           GM_registerMenuCommand
// @grant           GM_addStyle
// @grant           GM_setClipboard
// @grant           unsafeWindow
// ==/UserScript==

// ==OpenUserJS==
// @author      cuzi
// ==/OpenUserJS==

/*
MIT License

Copyright (c) 2020 cvzi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

/* globals React, ReactDOM */
(function (React, ReactDOM) {
  'use strict';

  function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
      Object.keys(e).forEach(function (k) {
        if (k !== 'default') {
          var d = Object.getOwnPropertyDescriptor(e, k);
          Object.defineProperty(n, k, d.get ? d : {
            enumerable: true,
            get: function () { return e[k]; }
          });
        }
      });
    }
    n.default = e;
    return Object.freeze(n);
  }

  var React__namespace = /*#__PURE__*/_interopNamespaceDefault(React);
  var ReactDOM__namespace = /*#__PURE__*/_interopNamespaceDefault(ReactDOM);

  /*
  Compatibility adaptions for Violentmonkey https://github.com/violentmonkey/violentmonkey
  */

  if (typeof GM.registerMenuCommand !== 'function') {
    if (typeof GM_registerMenuCommand === 'function') {
      GM.registerMenuCommand = GM_registerMenuCommand;
    } else {
      console.warn('Neither GM.registerMenuCommand nor GM_registerMenuCommand are available');
    }
  }

  function _defineProperty(obj, key, value) {
    key = _toPropertyKey(key);
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _toPrimitive(input, hint) {
    if (typeof input !== "object" || input === null) return input;
    var prim = input[Symbol.toPrimitive];
    if (prim !== undefined) {
      var res = prim.call(input, hint || "default");
      if (typeof res !== "object") return res;
      throw new TypeError("@@toPrimitive must return a primitive value.");
    }
    return (hint === "string" ? String : Number)(input);
  }
  function _toPropertyKey(arg) {
    var key = _toPrimitive(arg, "string");
    return typeof key === "symbol" ? key : String(key);
  }

  function _extends() {
    _extends = Object.assign ? Object.assign.bind() : function (target) {
      for (var i = 1; i < arguments.length; i++) {
        var source = arguments[i];
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key];
          }
        }
      }
      return target;
    };
    return _extends.apply(this, arguments);
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }
    return self;
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };
    return _setPrototypeOf(o, p);
  }

  function _inheritsLoose(subClass, superClass) {
    subClass.prototype = Object.create(superClass.prototype);
    subClass.prototype.constructor = subClass;
    _setPrototypeOf(subClass, superClass);
  }

  var safeIsNaN = Number.isNaN || function ponyfill(value) {
    return typeof value === 'number' && value !== value;
  };
  function isEqual(first, second) {
    if (first === second) {
      return true;
    }
    if (safeIsNaN(first) && safeIsNaN(second)) {
      return true;
    }
    return false;
  }
  function areInputsEqual(newInputs, lastInputs) {
    if (newInputs.length !== lastInputs.length) {
      return false;
    }
    for (var i = 0; i < newInputs.length; i++) {
      if (!isEqual(newInputs[i], lastInputs[i])) {
        return false;
      }
    }
    return true;
  }
  function memoizeOne(resultFn, isEqual) {
    if (isEqual === void 0) {
      isEqual = areInputsEqual;
    }
    var lastThis;
    var lastArgs = [];
    var lastResult;
    var calledOnce = false;
    function memoized() {
      var newArgs = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        newArgs[_i] = arguments[_i];
      }
      if (calledOnce && lastThis === this && isEqual(newArgs, lastArgs)) {
        return lastResult;
      }
      lastResult = resultFn.apply(this, newArgs);
      calledOnce = true;
      lastThis = this;
      lastArgs = newArgs;
      return lastResult;
    }
    return memoized;
  }

  // Animation frame based implementation of setTimeout.
  // Inspired by Joe Lambert, https://gist.github.com/joelambert/1002116#file-requesttimeout-js
  var hasNativePerformanceNow = typeof performance === 'object' && typeof performance.now === 'function';
  var now = hasNativePerformanceNow ? function () {
    return performance.now();
  } : function () {
    return Date.now();
  };
  function cancelTimeout(timeoutID) {
    cancelAnimationFrame(timeoutID.id);
  }
  function requestTimeout(callback, delay) {
    var start = now();
    function tick() {
      if (now() - start >= delay) {
        callback.call(null);
      } else {
        timeoutID.id = requestAnimationFrame(tick);
      }
    }
    var timeoutID = {
      id: requestAnimationFrame(tick)
    };
    return timeoutID;
  }
  var size = -1; // This utility copied from "dom-helpers" package.

  function getScrollbarSize(recalculate) {
    if (recalculate === void 0) {
      recalculate = false;
    }
    if (size === -1 || recalculate) {
      var div = document.createElement('div');
      var style = div.style;
      style.width = '50px';
      style.height = '50px';
      style.overflow = 'scroll';
      document.body.appendChild(div);
      size = div.offsetWidth - div.clientWidth;
      document.body.removeChild(div);
    }
    return size;
  }
  var cachedRTLResult = null; // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
  // Chrome does not seem to adhere; its scrollLeft values are positive (measured relative to the left).
  // Safari's elastic bounce makes detecting this even more complicated wrt potential false positives.
  // The safest way to check this is to intentionally set a negative offset,
  // and then verify that the subsequent "scroll" event matches the negative offset.
  // If it does not match, then we can assume a non-standard RTL scroll implementation.

  function getRTLOffsetType(recalculate) {
    if (recalculate === void 0) {
      recalculate = false;
    }
    if (cachedRTLResult === null || recalculate) {
      var outerDiv = document.createElement('div');
      var outerStyle = outerDiv.style;
      outerStyle.width = '50px';
      outerStyle.height = '50px';
      outerStyle.overflow = 'scroll';
      outerStyle.direction = 'rtl';
      var innerDiv = document.createElement('div');
      var innerStyle = innerDiv.style;
      innerStyle.width = '100px';
      innerStyle.height = '100px';
      outerDiv.appendChild(innerDiv);
      document.body.appendChild(outerDiv);
      if (outerDiv.scrollLeft > 0) {
        cachedRTLResult = 'positive-descending';
      } else {
        outerDiv.scrollLeft = 1;
        if (outerDiv.scrollLeft === 0) {
          cachedRTLResult = 'negative';
        } else {
          cachedRTLResult = 'positive-ascending';
        }
      }
      document.body.removeChild(outerDiv);
      return cachedRTLResult;
    }
    return cachedRTLResult;
  }
  var IS_SCROLLING_DEBOUNCE_INTERVAL$1 = 150;
  var defaultItemKey$1 = function defaultItemKey(index, data) {
    return index;
  }; // In DEV mode, this Set helps us only log a warning once per component instance.
  function createListComponent(_ref) {
    var _class;
    var getItemOffset = _ref.getItemOffset,
      getEstimatedTotalSize = _ref.getEstimatedTotalSize,
      getItemSize = _ref.getItemSize,
      getOffsetForIndexAndAlignment = _ref.getOffsetForIndexAndAlignment,
      getStartIndexForOffset = _ref.getStartIndexForOffset,
      getStopIndexForStartIndex = _ref.getStopIndexForStartIndex,
      initInstanceProps = _ref.initInstanceProps,
      shouldResetStyleCacheOnItemSizeChange = _ref.shouldResetStyleCacheOnItemSizeChange,
      validateProps = _ref.validateProps;
    return _class = /*#__PURE__*/function (_PureComponent) {
      _inheritsLoose(List, _PureComponent);

      // Always use explicit constructor for React components.
      // It produces less code after transpilation. (#26)
      // eslint-disable-next-line no-useless-constructor
      function List(props) {
        var _this;
        _this = _PureComponent.call(this, props) || this;
        _this._instanceProps = initInstanceProps(_this.props, _assertThisInitialized(_this));
        _this._outerRef = void 0;
        _this._resetIsScrollingTimeoutId = null;
        _this.state = {
          instance: _assertThisInitialized(_this),
          isScrolling: false,
          scrollDirection: 'forward',
          scrollOffset: typeof _this.props.initialScrollOffset === 'number' ? _this.props.initialScrollOffset : 0,
          scrollUpdateWasRequested: false
        };
        _this._callOnItemsRendered = void 0;
        _this._callOnItemsRendered = memoizeOne(function (overscanStartIndex, overscanStopIndex, visibleStartIndex, visibleStopIndex) {
          return _this.props.onItemsRendered({
            overscanStartIndex: overscanStartIndex,
            overscanStopIndex: overscanStopIndex,
            visibleStartIndex: visibleStartIndex,
            visibleStopIndex: visibleStopIndex
          });
        });
        _this._callOnScroll = void 0;
        _this._callOnScroll = memoizeOne(function (scrollDirection, scrollOffset, scrollUpdateWasRequested) {
          return _this.props.onScroll({
            scrollDirection: scrollDirection,
            scrollOffset: scrollOffset,
            scrollUpdateWasRequested: scrollUpdateWasRequested
          });
        });
        _this._getItemStyle = void 0;
        _this._getItemStyle = function (index) {
          var _this$props = _this.props,
            direction = _this$props.direction,
            itemSize = _this$props.itemSize,
            layout = _this$props.layout;
          var itemStyleCache = _this._getItemStyleCache(shouldResetStyleCacheOnItemSizeChange && itemSize, shouldResetStyleCacheOnItemSizeChange && layout, shouldResetStyleCacheOnItemSizeChange && direction);
          var style;
          if (itemStyleCache.hasOwnProperty(index)) {
            style = itemStyleCache[index];
          } else {
            var _offset = getItemOffset(_this.props, index, _this._instanceProps);
            var size = getItemSize(_this.props, index, _this._instanceProps); // TODO Deprecate direction "horizontal"

            var isHorizontal = direction === 'horizontal' || layout === 'horizontal';
            var isRtl = direction === 'rtl';
            var offsetHorizontal = isHorizontal ? _offset : 0;
            itemStyleCache[index] = style = {
              position: 'absolute',
              left: isRtl ? undefined : offsetHorizontal,
              right: isRtl ? offsetHorizontal : undefined,
              top: !isHorizontal ? _offset : 0,
              height: !isHorizontal ? size : '100%',
              width: isHorizontal ? size : '100%'
            };
          }
          return style;
        };
        _this._getItemStyleCache = void 0;
        _this._getItemStyleCache = memoizeOne(function (_, __, ___) {
          return {};
        });
        _this._onScrollHorizontal = function (event) {
          var _event$currentTarget = event.currentTarget,
            clientWidth = _event$currentTarget.clientWidth,
            scrollLeft = _event$currentTarget.scrollLeft,
            scrollWidth = _event$currentTarget.scrollWidth;
          _this.setState(function (prevState) {
            if (prevState.scrollOffset === scrollLeft) {
              // Scroll position may have been updated by cDM/cDU,
              // In which case we don't need to trigger another render,
              // And we don't want to update state.isScrolling.
              return null;
            }
            var direction = _this.props.direction;
            var scrollOffset = scrollLeft;
            if (direction === 'rtl') {
              // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
              // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
              // It's also easier for this component if we convert offsets to the same format as they would be in for ltr.
              // So the simplest solution is to determine which browser behavior we're dealing with, and convert based on it.
              switch (getRTLOffsetType()) {
                case 'negative':
                  scrollOffset = -scrollLeft;
                  break;
                case 'positive-descending':
                  scrollOffset = scrollWidth - clientWidth - scrollLeft;
                  break;
              }
            } // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.

            scrollOffset = Math.max(0, Math.min(scrollOffset, scrollWidth - clientWidth));
            return {
              isScrolling: true,
              scrollDirection: prevState.scrollOffset < scrollLeft ? 'forward' : 'backward',
              scrollOffset: scrollOffset,
              scrollUpdateWasRequested: false
            };
          }, _this._resetIsScrollingDebounced);
        };
        _this._onScrollVertical = function (event) {
          var _event$currentTarget2 = event.currentTarget,
            clientHeight = _event$currentTarget2.clientHeight,
            scrollHeight = _event$currentTarget2.scrollHeight,
            scrollTop = _event$currentTarget2.scrollTop;
          _this.setState(function (prevState) {
            if (prevState.scrollOffset === scrollTop) {
              // Scroll position may have been updated by cDM/cDU,
              // In which case we don't need to trigger another render,
              // And we don't want to update state.isScrolling.
              return null;
            } // Prevent Safari's elastic scrolling from causing visual shaking when scrolling past bounds.

            var scrollOffset = Math.max(0, Math.min(scrollTop, scrollHeight - clientHeight));
            return {
              isScrolling: true,
              scrollDirection: prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
              scrollOffset: scrollOffset,
              scrollUpdateWasRequested: false
            };
          }, _this._resetIsScrollingDebounced);
        };
        _this._outerRefSetter = function (ref) {
          var outerRef = _this.props.outerRef;
          _this._outerRef = ref;
          if (typeof outerRef === 'function') {
            outerRef(ref);
          } else if (outerRef != null && typeof outerRef === 'object' && outerRef.hasOwnProperty('current')) {
            outerRef.current = ref;
          }
        };
        _this._resetIsScrollingDebounced = function () {
          if (_this._resetIsScrollingTimeoutId !== null) {
            cancelTimeout(_this._resetIsScrollingTimeoutId);
          }
          _this._resetIsScrollingTimeoutId = requestTimeout(_this._resetIsScrolling, IS_SCROLLING_DEBOUNCE_INTERVAL$1);
        };
        _this._resetIsScrolling = function () {
          _this._resetIsScrollingTimeoutId = null;
          _this.setState({
            isScrolling: false
          }, function () {
            // Clear style cache after state update has been committed.
            // This way we don't break pure sCU for items that don't use isScrolling param.
            _this._getItemStyleCache(-1, null);
          });
        };
        return _this;
      }
      List.getDerivedStateFromProps = function getDerivedStateFromProps(nextProps, prevState) {
        validateSharedProps$1(nextProps, prevState);
        validateProps(nextProps);
        return null;
      };
      var _proto = List.prototype;
      _proto.scrollTo = function scrollTo(scrollOffset) {
        scrollOffset = Math.max(0, scrollOffset);
        this.setState(function (prevState) {
          if (prevState.scrollOffset === scrollOffset) {
            return null;
          }
          return {
            scrollDirection: prevState.scrollOffset < scrollOffset ? 'forward' : 'backward',
            scrollOffset: scrollOffset,
            scrollUpdateWasRequested: true
          };
        }, this._resetIsScrollingDebounced);
      };
      _proto.scrollToItem = function scrollToItem(index, align) {
        if (align === void 0) {
          align = 'auto';
        }
        var _this$props2 = this.props,
          itemCount = _this$props2.itemCount,
          layout = _this$props2.layout;
        var scrollOffset = this.state.scrollOffset;
        index = Math.max(0, Math.min(index, itemCount - 1)); // The scrollbar size should be considered when scrolling an item into view, to ensure it's fully visible.
        // But we only need to account for its size when it's actually visible.
        // This is an edge case for lists; normally they only scroll in the dominant direction.

        var scrollbarSize = 0;
        if (this._outerRef) {
          var outerRef = this._outerRef;
          if (layout === 'vertical') {
            scrollbarSize = outerRef.scrollWidth > outerRef.clientWidth ? getScrollbarSize() : 0;
          } else {
            scrollbarSize = outerRef.scrollHeight > outerRef.clientHeight ? getScrollbarSize() : 0;
          }
        }
        this.scrollTo(getOffsetForIndexAndAlignment(this.props, index, align, scrollOffset, this._instanceProps, scrollbarSize));
      };
      _proto.componentDidMount = function componentDidMount() {
        var _this$props3 = this.props,
          direction = _this$props3.direction,
          initialScrollOffset = _this$props3.initialScrollOffset,
          layout = _this$props3.layout;
        if (typeof initialScrollOffset === 'number' && this._outerRef != null) {
          var outerRef = this._outerRef; // TODO Deprecate direction "horizontal"

          if (direction === 'horizontal' || layout === 'horizontal') {
            outerRef.scrollLeft = initialScrollOffset;
          } else {
            outerRef.scrollTop = initialScrollOffset;
          }
        }
        this._callPropsCallbacks();
      };
      _proto.componentDidUpdate = function componentDidUpdate() {
        var _this$props4 = this.props,
          direction = _this$props4.direction,
          layout = _this$props4.layout;
        var _this$state = this.state,
          scrollOffset = _this$state.scrollOffset,
          scrollUpdateWasRequested = _this$state.scrollUpdateWasRequested;
        if (scrollUpdateWasRequested && this._outerRef != null) {
          var outerRef = this._outerRef; // TODO Deprecate direction "horizontal"

          if (direction === 'horizontal' || layout === 'horizontal') {
            if (direction === 'rtl') {
              // TRICKY According to the spec, scrollLeft should be negative for RTL aligned elements.
              // This is not the case for all browsers though (e.g. Chrome reports values as positive, measured relative to the left).
              // So we need to determine which browser behavior we're dealing with, and mimic it.
              switch (getRTLOffsetType()) {
                case 'negative':
                  outerRef.scrollLeft = -scrollOffset;
                  break;
                case 'positive-ascending':
                  outerRef.scrollLeft = scrollOffset;
                  break;
                default:
                  var clientWidth = outerRef.clientWidth,
                    scrollWidth = outerRef.scrollWidth;
                  outerRef.scrollLeft = scrollWidth - clientWidth - scrollOffset;
                  break;
              }
            } else {
              outerRef.scrollLeft = scrollOffset;
            }
          } else {
            outerRef.scrollTop = scrollOffset;
          }
        }
        this._callPropsCallbacks();
      };
      _proto.componentWillUnmount = function componentWillUnmount() {
        if (this._resetIsScrollingTimeoutId !== null) {
          cancelTimeout(this._resetIsScrollingTimeoutId);
        }
      };
      _proto.render = function render() {
        var _this$props5 = this.props,
          children = _this$props5.children,
          className = _this$props5.className,
          direction = _this$props5.direction,
          height = _this$props5.height,
          innerRef = _this$props5.innerRef,
          innerElementType = _this$props5.innerElementType,
          innerTagName = _this$props5.innerTagName,
          itemCount = _this$props5.itemCount,
          itemData = _this$props5.itemData,
          _this$props5$itemKey = _this$props5.itemKey,
          itemKey = _this$props5$itemKey === void 0 ? defaultItemKey$1 : _this$props5$itemKey,
          layout = _this$props5.layout,
          outerElementType = _this$props5.outerElementType,
          outerTagName = _this$props5.outerTagName,
          style = _this$props5.style,
          useIsScrolling = _this$props5.useIsScrolling,
          width = _this$props5.width;
        var isScrolling = this.state.isScrolling; // TODO Deprecate direction "horizontal"

        var isHorizontal = direction === 'horizontal' || layout === 'horizontal';
        var onScroll = isHorizontal ? this._onScrollHorizontal : this._onScrollVertical;
        var _this$_getRangeToRend = this._getRangeToRender(),
          startIndex = _this$_getRangeToRend[0],
          stopIndex = _this$_getRangeToRend[1];
        var items = [];
        if (itemCount > 0) {
          for (var _index = startIndex; _index <= stopIndex; _index++) {
            items.push(React.createElement(children, {
              data: itemData,
              key: itemKey(_index, itemData),
              index: _index,
              isScrolling: useIsScrolling ? isScrolling : undefined,
              style: this._getItemStyle(_index)
            }));
          }
        } // Read this value AFTER items have been created,
        // So their actual sizes (if variable) are taken into consideration.

        var estimatedTotalSize = getEstimatedTotalSize(this.props, this._instanceProps);
        return React.createElement(outerElementType || outerTagName || 'div', {
          className: className,
          onScroll: onScroll,
          ref: this._outerRefSetter,
          style: _extends({
            position: 'relative',
            height: height,
            width: width,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
            willChange: 'transform',
            direction: direction
          }, style)
        }, React.createElement(innerElementType || innerTagName || 'div', {
          children: items,
          ref: innerRef,
          style: {
            height: isHorizontal ? '100%' : estimatedTotalSize,
            pointerEvents: isScrolling ? 'none' : undefined,
            width: isHorizontal ? estimatedTotalSize : '100%'
          }
        }));
      };
      _proto._callPropsCallbacks = function _callPropsCallbacks() {
        if (typeof this.props.onItemsRendered === 'function') {
          var itemCount = this.props.itemCount;
          if (itemCount > 0) {
            var _this$_getRangeToRend2 = this._getRangeToRender(),
              _overscanStartIndex = _this$_getRangeToRend2[0],
              _overscanStopIndex = _this$_getRangeToRend2[1],
              _visibleStartIndex = _this$_getRangeToRend2[2],
              _visibleStopIndex = _this$_getRangeToRend2[3];
            this._callOnItemsRendered(_overscanStartIndex, _overscanStopIndex, _visibleStartIndex, _visibleStopIndex);
          }
        }
        if (typeof this.props.onScroll === 'function') {
          var _this$state2 = this.state,
            _scrollDirection = _this$state2.scrollDirection,
            _scrollOffset = _this$state2.scrollOffset,
            _scrollUpdateWasRequested = _this$state2.scrollUpdateWasRequested;
          this._callOnScroll(_scrollDirection, _scrollOffset, _scrollUpdateWasRequested);
        }
      } // Lazily create and cache item styles while scrolling,
      // So that pure component sCU will prevent re-renders.
      // We maintain this cache, and pass a style prop rather than index,
      // So that List can clear cached styles and force item re-render if necessary.
      ;

      _proto._getRangeToRender = function _getRangeToRender() {
        var _this$props6 = this.props,
          itemCount = _this$props6.itemCount,
          overscanCount = _this$props6.overscanCount;
        var _this$state3 = this.state,
          isScrolling = _this$state3.isScrolling,
          scrollDirection = _this$state3.scrollDirection,
          scrollOffset = _this$state3.scrollOffset;
        if (itemCount === 0) {
          return [0, 0, 0, 0];
        }
        var startIndex = getStartIndexForOffset(this.props, scrollOffset, this._instanceProps);
        var stopIndex = getStopIndexForStartIndex(this.props, startIndex, scrollOffset, this._instanceProps); // Overscan by one item in each direction so that tab/focus works.
        // If there isn't at least one extra item, tab loops back around.

        var overscanBackward = !isScrolling || scrollDirection === 'backward' ? Math.max(1, overscanCount) : 1;
        var overscanForward = !isScrolling || scrollDirection === 'forward' ? Math.max(1, overscanCount) : 1;
        return [Math.max(0, startIndex - overscanBackward), Math.max(0, Math.min(itemCount - 1, stopIndex + overscanForward)), startIndex, stopIndex];
      };
      return List;
    }(React.PureComponent), _class.defaultProps = {
      direction: 'ltr',
      itemData: undefined,
      layout: 'vertical',
      overscanCount: 2,
      useIsScrolling: false
    }, _class;
  } // NOTE: I considered further wrapping individual items with a pure ListItem component.
  // This would avoid ever calling the render function for the same index more than once,
  // But it would also add the overhead of a lot of components/fibers.
  // I assume people already do this (render function returning a class component),
  // So my doing it would just unnecessarily double the wrappers.

  var validateSharedProps$1 = function validateSharedProps(_ref2, _ref3) {
    _ref2.children;
      _ref2.direction;
      _ref2.height;
      _ref2.layout;
      _ref2.innerTagName;
      _ref2.outerTagName;
      _ref2.width;
    _ref3.instance;
  };
  var FixedSizeList = /*#__PURE__*/createListComponent({
    getItemOffset: function getItemOffset(_ref, index) {
      var itemSize = _ref.itemSize;
      return index * itemSize;
    },
    getItemSize: function getItemSize(_ref2, index) {
      var itemSize = _ref2.itemSize;
      return itemSize;
    },
    getEstimatedTotalSize: function getEstimatedTotalSize(_ref3) {
      var itemCount = _ref3.itemCount,
        itemSize = _ref3.itemSize;
      return itemSize * itemCount;
    },
    getOffsetForIndexAndAlignment: function getOffsetForIndexAndAlignment(_ref4, index, align, scrollOffset, instanceProps, scrollbarSize) {
      var direction = _ref4.direction,
        height = _ref4.height,
        itemCount = _ref4.itemCount,
        itemSize = _ref4.itemSize,
        layout = _ref4.layout,
        width = _ref4.width;
      // TODO Deprecate direction "horizontal"
      var isHorizontal = direction === 'horizontal' || layout === 'horizontal';
      var size = isHorizontal ? width : height;
      var lastItemOffset = Math.max(0, itemCount * itemSize - size);
      var maxOffset = Math.min(lastItemOffset, index * itemSize);
      var minOffset = Math.max(0, index * itemSize - size + itemSize + scrollbarSize);
      if (align === 'smart') {
        if (scrollOffset >= minOffset - size && scrollOffset <= maxOffset + size) {
          align = 'auto';
        } else {
          align = 'center';
        }
      }
      switch (align) {
        case 'start':
          return maxOffset;
        case 'end':
          return minOffset;
        case 'center':
          {
            // "Centered" offset is usually the average of the min and max.
            // But near the edges of the list, this doesn't hold true.
            var middleOffset = Math.round(minOffset + (maxOffset - minOffset) / 2);
            if (middleOffset < Math.ceil(size / 2)) {
              return 0; // near the beginning
            } else if (middleOffset > lastItemOffset + Math.floor(size / 2)) {
              return lastItemOffset; // near the end
            } else {
              return middleOffset;
            }
          }
        case 'auto':
        default:
          if (scrollOffset >= minOffset && scrollOffset <= maxOffset) {
            return scrollOffset;
          } else if (scrollOffset < minOffset) {
            return minOffset;
          } else {
            return maxOffset;
          }
      }
    },
    getStartIndexForOffset: function getStartIndexForOffset(_ref5, offset) {
      var itemCount = _ref5.itemCount,
        itemSize = _ref5.itemSize;
      return Math.max(0, Math.min(itemCount - 1, Math.floor(offset / itemSize)));
    },
    getStopIndexForStartIndex: function getStopIndexForStartIndex(_ref6, startIndex, scrollOffset) {
      var direction = _ref6.direction,
        height = _ref6.height,
        itemCount = _ref6.itemCount,
        itemSize = _ref6.itemSize,
        layout = _ref6.layout,
        width = _ref6.width;
      // TODO Deprecate direction "horizontal"
      var isHorizontal = direction === 'horizontal' || layout === 'horizontal';
      var offset = startIndex * itemSize;
      var size = isHorizontal ? width : height;
      var numVisibleItems = Math.ceil((size + scrollOffset - offset) / itemSize);
      return Math.max(0, Math.min(itemCount - 1, startIndex + numVisibleItems - 1 // -1 is because stop index is inclusive
      ));
    },

    initInstanceProps: function initInstanceProps(props) {// Noop
    },
    shouldResetStyleCacheOnItemSizeChange: true,
    validateProps: function validateProps(_ref7) {
      _ref7.itemSize;
    }
  });

  /* globals GM */
  function Explorer(root, hooks) {
    function runHooks(name, ...args) {
      if (!(name in hooks)) {
        return;
      }
      if (!Array.isArray(hooks[name])) {
        hooks[name] = [hooks[name]];
      }
      return Promise.all(hooks[name].map(f => f(...args)));
    }
    class AlbumListItem extends React__namespace.Component {
      constructor(props) {
        super(props);
        _defineProperty(this, "handleAlbumClick", ev => {
          const targetStyle = ev.target.style;
          targetStyle.cursor = document.body.style.cursor = 'wait';
          const url = this.state.TralbumData.url;
          window.setTimeout(function () {
            runHooks('playAlbumFromUrl', url).then(function () {
              targetStyle.cursor = document.body.style.cursor = '';
            });
          }, 1);
        });
        _defineProperty(this, "handleContextMenu", ev => {
          ev.preventDefault();
          ev.target.classList.add('selected');
          const TralbumData = this.state.TralbumData;
          const url = TralbumData.url;
          if (!confirm(`Delete album "${TralbumData.current.title}" by ${TralbumData.artist}?`)) {
            ev.target.classList.remove('selected');
            return;
          }
          window.setTimeout(() => {
            runHooks('deletePermanentTralbum', url).then(function () {
              ev.target.classList.remove('selected');
              ev.target.style.visibility = 'hidden';
            });
          }, 1);
        });
        this.state = {
          TralbumData: props.data.library[Object.keys(props.data.library)[props.index]]
        };
      }
      render() {
        return /*#__PURE__*/React__namespace.createElement("div", {
          className: `albumListItem ${this.props.index % 2 ? 'albumListItemOdd' : ''}`,
          onClick: this.handleAlbumClick,
          onContextMenu: this.handleContextMenu,
          title: "Click to play",
          style: this.props.style
        }, this.state.TralbumData.artist, " - ", this.state.TralbumData.current.title);
      }
    }
    class AlbumList extends React__namespace.Component {
      constructor(props) {
        super(props);
        this.state = {
          library: {},
          isLoading: false,
          error: null
        };
        if (!this.props.getKey) {
          throw Error('<AlbumList> needs a getKey property');
        }
      }
      componentDidMount() {
        this.setState({
          isLoading: true
        });
        GM.getValue(this.props.getKey, '{}').then(s => JSON.parse(s)).then(data => this.setState({
          library: data,
          isLoading: false
        })).catch(error => this.setState({
          error,
          isLoading: false
        }));
      }
      render() {
        const {
          library,
          isLoading,
          error
        } = this.state;
        if (error) {
          return /*#__PURE__*/React__namespace.createElement("p", null, error.message);
        }
        if (isLoading) {
          return /*#__PURE__*/React__namespace.createElement("p", null, "Loading ...");
        }
        return /*#__PURE__*/React__namespace.createElement(FixedSizeList, {
          className: "List",
          height: 600,
          itemCount: Object.keys(library).length,
          itemSize: 35
          //width={600}
          ,
          itemData: {
            library: library
          }
        }, AlbumListItem);
      }
    }
    this.render = function () {
      ReactDOM__namespace.createRoot(root).render( /*#__PURE__*/React__namespace.createElement(AlbumList, {
        getKey: "tralbumlibrary"
      }));
    };
  }

  var discographyplayerCSS = ".cll{clear:left}.clb{clear:both}#discographyplayer{z-index:1010;position:fixed;bottom:0;height:83px;width:100%;padding-top:3px;background:#fff;color:#505958;border-top:1px solid rgba(0,0,0,.15);font:13px/1.231 \"Helvetica Neue\",Helvetica,Arial,sans-serif;transition:bottom .5s}#discographyplayer a:link,#discographyplayer a:visited{color:#0687f5;text-decoration:none;cursor:pointer}#discographyplayer a:hover{color:#0687f5;text-decoration:underline;cursor:pointer}#discographyplayer .nowPlaying .cover,#discographyplayer .nowPlaying .info{display:inline-block;vertical-align:top}#discographyplayer .nowPlaying img{width:60px;height:60px;margin-top:4px;margin-left:4px;margin-bottom:4px}#discographyplayer .nowPlaying .info{line-height:18px;margin-left:8px;margin-top:8px;max-width:calc(100% - 76px);border:0 solid #000;padding:0;width:auto;max-height:auto;overflow-y:hidden}#discographyplayer .nowPlaying .info .album,#discographyplayer .nowPlaying .info .title{font-size:13px;font-weight:400;color:#0687f5;margin:0;padding:0}#discographyplayer .currentlyPlaying{display:inline-block;vertical-align:top;overflow:hidden;transition:margin-left 3s ease-in-out;width:99%}#discographyplayer .nextInRow{display:inline-block;vertical-align:top;width:0%;overflow:hidden;transition:width 6s ease-in-out}#discographyplayer .durationDisplay{margin-top:24px;float:left}#discographyplayer .downloadlink:link{display:block;float:right;margin-top:22px;font-size:15px;padding:0 3px;color:#0687f5;border:1px solid #0687f5;transition:color .3s ease-in-out,border-color .3s ease-in-out}#discographyplayer .downloadlink:hover{text-decoration:none;background-color:#0687f5;color:#fff;border:1px solid #fff}#discographyplayer .downloadlink.downloading{color:#f0f;border-color:#f0f;animation:downloadrotation 3s infinite linear;cursor:wait}@keyframes downloadrotation{from{transform:rotate(0)}to{transform:rotate(359deg)}}#discographyplayer .controls{margin-top:10px;width:auto;float:left}#discographyplayer .controls>*{display:inline-block;cursor:pointer;border:1px solid #d9d9d9;padding:11px;margin-right:4px;height:18px;width:17px;transition:background-color .1s}#discographyplayer .controls>:hover{background-color:#0687f52b}#discographyplayer .playpause .play{width:0;height:0;border-top:9px inset transparent;border-bottom:9px inset transparent;border-left:15px solid #222;cursor:pointer;margin-left:2px}#discographyplayer .playpause .pause{border:0;border-left:5px solid #2d2d2d;border-right:5px solid #2d2d2d;height:18px;width:4px;margin-right:2px;margin-left:1px}#discographyplayer .playpause .busy{background-image:url(https://bandcamp.com/img/playerbusy-noborder.gif);background-position:50% 50%;background-repeat:no-repeat;border:none;height:30px;margin:0 0 0 -3px;width:25px;overflow:hidden;background-size:contain}#discographyplayer .shuffleswitch .shufflebutton{background-size:cover;background-position-y:0px;filter:drop-shadow(#FFFF 0px 0px 0px);transition:filter .5s;border:0;height:13px;width:20px;margin-top:4px}#discographyplayer .shuffleswitch .shufflebutton.active{filter:drop-shadow(#0060F2 1px 1px 2px)}#discographyplayer .arrowbutton{border:0;height:13px;width:20px;margin-top:4px;background:url(https://bandcamp.com/img/nextprev.png) 0 0/40px 12px no-repeat transparent;background-position-x:0px;cursor:pointer}#discographyplayer .arrowbutton.next-icon{background-position:100% 0}#discographyplayer .arrowbutton.prevalbum-icon{border-right:3px solid #2d2d2d}#discographyplayer .arrowbutton.nextalbum-icon{background-position:100% 0;border-left:3px solid #2d2d2d}#timeline{width:100%;background:rgba(50,50,50,.4);margin-top:5px;border-left:1px solid #000;border-right:1px solid #000}#playhead{width:10px;height:10px;border-radius:50%;background:#323232;cursor:pointer}.bufferbaranimation{transition:width 1s}#bufferbar{position:absolute;width:0;height:10px;background:rgba(0,0,0,.1)}#discographyplayer .playlist{position:relative;width:100%;display:inline-block;max-height:80px;overflow:auto;list-style:none;margin:0;padding:0 5px 0 5px;scrollbar-color:rgba(50,50,50,0.4) white;background:#fff}#discographyplayer_contextmenu{position:absolute;box-shadow:#000000b0 2px 2px 2px;background-color:#fff;border:#619aa9 2px solid;z-index:1011}#discographyplayer_contextmenu .contextmenu_submenu{cursor:pointer;padding:2px;border:1px solid #619aa9}#discographyplayer_contextmenu .contextmenu_submenu:hover{background-color:#619aa9;color:#fff;border:1px solid #fff}#discographyplayer .playlist .isselected{border:1px solid red}#discographyplayer .playlist .playlistentry{cursor:pointer;margin:1px 0}#discographyplayer .playlist .playlistentry .duration{float:right}#discographyplayer .playlist .playing{background:#619aa950}#discographyplayer .playlist .playlistheading{background:rgba(50,50,50,.4);margin:3px 0}#discographyplayer .playlist .playlistheading a:hover,#discographyplayer .playlist .playlistheading a:link,#discographyplayer .playlist .playlistheading a:visited{color:#eee;cursor:pointer}#discographyplayer .playlist .playlistheading a.notloaded{color:#ccc}#discographyplayer .playlist .playlistheading.notloaded{cursor:copy}#discographyplayer .vol{float:left;position:relative;width:100px;margin-left:1em;margin-top:1em}#discographyplayer .vol-icon-wrapper{font-size:20px;cursor:pointer;width:27px}#discographyplayer .vol-slider{width:60px;height:10px;position:relative;cursor:pointer}#discographyplayer .vol>*{display:inline-block;vertical-align:middle}#discographyplayer .vol-bg{background:rgba(50,50,50,.4);width:100%;margin-top:4px;height:3px;position:absolute}#discographyplayer .vol-amt{margin-top:4px;height:3px;position:absolute;background:#323232}#discographyplayer .vol-control-outer{height:100%;position:relative;margin-left:-3px;margin-right:5px}#discographyplayer .collect{float:left;margin-left:1em}#discographyplayer .{cursor:default;margin-top:.5em}#discographyplayer .collect-wishlist .wishlist-add{cursor:pointer}#discographyplayer .collect-listened{cursor:pointer;margin-top:.5em;margin-left:2px}#discographyplayer .collect .icon{height:13px;width:14px;display:inline-block;position:relative;top:2px}#discographyplayer .collect .add-item-icon{background-position:0 -73px}#discographyplayer .collect .collected-item-icon{background-position:-28px -73px}#discographyplayer .collect .own-item-icon{background-position:-42px -73px}#discographyplayer .collect .wishlist-add,#discographyplayer .collect .wishlist-collected,#discographyplayer .collect .wishlist-own,#discographyplayer .collect .wishlist-saving{display:none}#discographyplayer .collect .wishlist-add:hover .add-item-icon{background-position:-56px -73px}#discographyplayer .collect .wishlist-add .add-item-label:hover{text-decoration:underline}#discographyplayer .collect .listened,#discographyplayer .collect .listened-saving,#discographyplayer .collect .mark-listened{display:none}#discographyplayer .collect .listened .listened-symbol{color:#00dc32;text-shadow:1px 0 #ddd,-1px 0 #ddd,0 -1px #ddd,0 1px #ddd}#discographyplayer .collect .mark-listened .mark-listened-symbol{color:#fff;text-shadow:1px 0 #959595,-1px 0 #959595,0 -1px #959595,0 1px #959595}#discographyplayer .collect .mark-listened:hover .mark-listened-symbol{text-shadow:1px 0 #0af,-1px 0 #0af,0 -1px #0af,0 1px #0af}#discographyplayer .collect .mark-listened:hover .mark-listened-label{text-decoration:underline}#discographyplayer .closebutton,#discographyplayer .minimizebutton{position:absolute;top:1px;right:1px;border:1px solid #505958;color:#505958;font-size:10px;box-shadow:0 0 2px #505958;cursor:pointer;opacity:0;transition:opacity .3s;min-width:8px;min-height:13px;text-align:center}#discographyplayer .minimizebutton{right:13px}#discographyplayer .minimizebutton .minimized{display:none}#discographyplayer .minimizebutton.minimized .maximized{display:none}#discographyplayer .minimizebutton.minimized .minimized{display:inline}#discographyplayer:hover .closebutton,#discographyplayer:hover .minimizebutton{opacity:1}#discographyplayer .col{float:left;min-height:1px;position:relative}#discographyplayer .col25{width:25%}#discographyplayer .col35{width:35%}#discographyplayer .col30{width:30%}#discographyplayer .col15{width:14%}#discographyplayer .col20{width:20%}#discographyplayer .colcontrols{user-select:none}#discographyplayer .colvolumecontrols{margin-left:10px}.albumIsCurrentlyPlaying{border:2px solid #0f0}.albumIsCurrentlyPlaying+.art-play{display:none}.dig-deeper-item .albumIsCurrentlyPlaying,.music-grid-item .albumIsCurrentlyPlaying{border:none}.albumIsCurrentlyPlayingIndicator{display:none}.dig-deeper-item .albumIsCurrentlyPlayingIndicator,.music-grid-item .albumIsCurrentlyPlayingIndicator{position:absolute;display:block;width:74px;height:54px;left:50%;top:50%;margin-left:-36px;margin-top:-27px;opacity:.5;transition:opacity .2s}.albumIsCurrentlyPlayingIndicator .currentlyPlayingBg{position:absolute;width:100%;height:100%;left:0;top:0;background:#000;border-radius:4px}.albumIsCurrentlyPlayingIndicator .currentlyPlayingIcon{position:absolute;width:10px;height:20px;left:28px;top:17px;border-width:0 5px;border-color:#fff;border-style:solid}@media (max-width:1600px){#discographyplayer .controls>*{padding:4px 11px 5px 11px;height:18px}#discographyplayer .durationDisplay{margin-top:0}#discographyplayer .downloadlink:link{margin-top:0}}@media (max-width:1170px){#discographyplayer .colcontrols{width:39%}#discographyplayer .colvolumecontrols{display:none}}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODEyNS9zcmMvY3NzL2Rpc2NvZ3JhcGh5cGxheWVyLmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxLQUNFLE1BQU0sS0FFUixLQUNFLE1BQU0sS0FFUixtQkFDRSxRQUFRLEtBQ1IsU0FBUyxNQUNULE9BQU8sRUFDUCxPQUFPLEtBQ1AsTUFBTSxLQUNOLFlBQVksSUFDWixXQUFXLEtBQ1gsTUFBTSxRQUNOLFdBQVksSUFBSSxNQUFNLGdCQUN0QixLQUFNLElBQUksQ0FBQyxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsV0FDbEQsV0FBWSxPQUFPLElBRXJCLDBCQUEwQiw2QkFDeEIsTUFBTyxRQUNQLGdCQUFpQixLQUNqQixPQUFRLFFBRVYsMkJBQ0UsTUFBTyxRQUNQLGdCQUFpQixVQUNqQixPQUFRLFFBRTJCLHNDQUFyQyxxQ0FDSSxRQUFTLGFBQ1QsZUFBZ0IsSUFFcEIsbUNBQ0ksTUFBTyxLQUNQLE9BQVEsS0FDUixXQUFZLElBQ1osWUFBYSxJQUNiLGNBQWUsSUFFbkIscUNBQ0ksWUFBYSxLQUNiLFlBQWEsSUFDYixXQUFZLElBQ1osVUFBVyxrQkFFWCxPQUFRLEVBQUksTUFBTSxLQUNsQixRQUFTLEVBQ1QsTUFBTyxLQUNQLFdBQVksS0FDWixXQUFZLE9BRTZCLDRDQUE3Qyw0Q0FDRSxVQUFXLEtBQ1gsWUFBYSxJQUNiLE1BQU8sUUFDUCxPQUFPLEVBQ1AsUUFBUSxFQUVWLHFDQUNFLFFBQVEsYUFDUixlQUFnQixJQUNoQixTQUFVLE9BQ1YsV0FBWSxZQUFZLEdBQUcsWUFDM0IsTUFBTSxJQUVSLDhCQUNFLFFBQVEsYUFDUixlQUFnQixJQUNoQixNQUFNLEdBQ04sU0FBVSxPQUNWLFdBQVksTUFBTSxHQUFHLFlBRXZCLG9DQUNFLFdBQVcsS0FDWCxNQUFNLEtBRVIsc0NBQ0UsUUFBUSxNQUNSLE1BQU0sTUFDTixXQUFZLEtBQ1osVUFBVSxLQUNWLFFBQVMsRUFBSSxJQUNiLE1BQU8sUUFDUCxPQUFPLElBQUksTUFBTSxRQUNqQixXQUFZLE1BQU0sSUFBTSxXQUFXLENBQUUsYUFBYSxJQUFNLFlBRTFELHVDQUNFLGdCQUFnQixLQUNoQixpQkFBaUIsUUFDakIsTUFBTSxLQUNOLE9BQU8sSUFBSSxNQUFNLEtBRW5CLDZDQUNFLE1BQU0sS0FDTixhQUFhLEtBQ2IsVUFBVyxpQkFBaUIsR0FBRyxTQUFTLE9BQ3hDLE9BQU8sS0FFVCw0QkFDRSxLQUFNLFVBQVcsVUFDakIsR0FBSSxVQUFXLGdCQUVqQiw2QkFDRSxXQUFZLEtBQ1osTUFBTyxLQUNQLE1BQU0sS0FFUiwrQkFDRSxRQUFRLGFBQ1IsT0FBUSxRQUNSLE9BQVEsSUFBSSxNQUFNLFFBQ2xCLFFBQVMsS0FDVCxhQUFjLElBQ2QsT0FBUSxLQUNSLE1BQU8sS0FDUCxXQUFZLGlCQUFpQixJQUUvQixvQ0FDRSxpQkFBaUIsVUFHbkIsb0NBQ0UsTUFBTyxFQUNQLE9BQVEsRUFDUixXQUFZLElBQUksTUFBTSxZQUN0QixjQUFlLElBQUksTUFBTSxZQUN6QixZQUFhLEtBQUssTUFBTSxLQUN4QixPQUFRLFFBQ1IsWUFBYSxJQUVmLHFDQUNFLE9BQVEsRUFDUixZQUFhLElBQUksTUFBTSxRQUN2QixhQUFjLElBQUksTUFBTSxRQUN4QixPQUFRLEtBQ1IsTUFBTyxJQUNQLGFBQWMsSUFDZCxZQUFhLElBRWYsb0NBQ0UsaUJBQWtCLHNEQUNsQixvQkFBcUIsSUFBSSxJQUN6QixrQkFBbUIsVUFDbkIsT0FBUSxLQUNSLE9BQVEsS0FDUixPQUFRLEVBQUksRUFBSSxFQUFJLEtBQ3BCLE1BQU8sS0FDUCxTQUFVLE9BQ1YsZ0JBQWlCLFFBRW5CLGlEQUNFLGdCQUFnQixNQUNoQixzQkFBdUIsSUFFdkIsT0FBTywrQkFDUCxXQUFZLE9BQU8sSUFDbkIsT0FBUSxFQUNSLE9BQVEsS0FDUixNQUFPLEtBQ1AsV0FBWSxJQUVkLHdEQUNFLE9BQU8saUNBRVQsZ0NBQ0UsT0FBUSxFQUNSLE9BQVEsS0FDUixNQUFPLEtBQ1AsV0FBWSxJQUNaLFdBQVksMkNBQTJDLEVBQUksQ0FBSSxDQUFFLEtBQUssS0FBSyxVQUFVLFlBQ3JGLHNCQUF1QixJQUN2QixPQUFRLFFBRVYsMENBQ0Usb0JBQXFCLEtBQUssRUFLNUIsK0NBQ0UsYUFBYyxJQUFJLE1BQU0sUUFFMUIsK0NBQ0Usb0JBQXFCLEtBQUssRUFDMUIsWUFBYSxJQUFJLE1BQU0sUUFFekIsVUFDRSxNQUFPLEtBQ1AsV0FBWSxrQkFDWixXQUFXLElBQ1gsWUFBWSxJQUFJLE1BQU0sS0FDdEIsYUFBYSxJQUFJLE1BQU0sS0FFekIsVUFDRSxNQUFNLEtBQ04sT0FBTyxLQUNQLGNBQWUsSUFDZixXQUFXLFFBQ1gsT0FBTyxRQUVULG9CQUNFLFdBQVksTUFBTSxHQUVwQixXQUNFLFNBQVMsU0FDVCxNQUFNLEVBQ04sT0FBTyxLQUNQLFdBQVcsZUFFYiw2QkFDRSxTQUFTLFNBQ1QsTUFBTSxLQUNOLFFBQVEsYUFDUixXQUFXLEtBQ1gsU0FBUyxLQUNULFdBQVcsS0FDWCxPQUFPLEVBQ1AsUUFBUyxFQUFJLElBQUksRUFBSSxJQUNyQixnQkFBaUIsbUJBQW1CLE1BQ3BDLFdBQVcsS0FFYiwrQkFDRSxTQUFTLFNBQ1QsV0FBWSxVQUFVLElBQUksSUFBSSxJQUM5QixpQkFBaUIsS0FDakIsT0FBUSxRQUFRLElBQUksTUFDcEIsUUFBUSxLQUVWLG9EQUNFLE9BQU8sUUFDUCxRQUFRLElBQ1IsT0FBUSxJQUFJLE1BQU0sUUFFcEIsMERBQ0UsaUJBQWlCLFFBQ2pCLE1BQU0sS0FDTixPQUFRLElBQUksTUFBTSxLQUVwQix5Q0FDRSxPQUFPLElBQUksTUFBTSxJQUVuQiw0Q0FDRSxPQUFPLFFBQ1AsT0FBTyxJQUFJLEVBRWIsc0RBQ0UsTUFBTSxNQUVSLHNDQUNFLFdBQVcsVUFFYiw4Q0FDRSxXQUFXLGtCQUNYLE9BQU8sSUFBSSxFQUV3QyxzREFBckQscURBQTJHLHdEQUN6RyxNQUFNLEtBQ04sT0FBTyxRQUVULDBEQUNFLE1BQU0sS0FFUix3REFDRSxPQUFPLEtBRVQsd0JBQ0UsTUFBTSxLQUNOLFNBQVUsU0FDVixNQUFPLE1BQ1AsWUFBYSxJQUNiLFdBQVksSUFFZCxxQ0FDRSxVQUFXLEtBQ1gsT0FBUSxRQUNSLE1BQU0sS0FFUiwrQkFDRSxNQUFPLEtBQ1AsT0FBUSxLQUNSLFNBQVUsU0FDVixPQUFRLFFBRVYsMEJBQ0UsUUFBUyxhQUNULGVBQWdCLE9BRWxCLDJCQUNFLFdBQVksa0JBQ1osTUFBTyxLQUNQLFdBQVksSUFDWixPQUFRLElBQ1IsU0FBVSxTQUVaLDRCQUNFLFdBQVksSUFDWixPQUFRLElBQ1IsU0FBVSxTQUNWLFdBQVksUUFFZCxzQ0FDRSxPQUFRLEtBQ1IsU0FBVSxTQUNWLFlBQWEsS0FDYixhQUFjLElBRWhCLDRCQUNFLE1BQU0sS0FDTixZQUFhLElBRWYscUJBQ0UsT0FBTyxRQUNQLFdBQVcsS0FFYixtREFDRSxPQUFPLFFBRVQscUNBQ0UsT0FBTyxRQUNQLFdBQVcsS0FDWCxZQUFhLElBRWYsa0NBQ0UsT0FBUSxLQUNSLE1BQU8sS0FDUCxRQUFTLGFBQ1QsU0FBVSxTQUNWLElBQUssSUFFUCwyQ0FDRSxvQkFBcUIsRUFBSSxNQUUzQixpREFDRSxvQkFBcUIsTUFBTSxNQUU3QiwyQ0FDRSxvQkFBcUIsTUFBTSxNQUU3QiwwQ0FBMEMsZ0RBQWdELDBDQUEwQyw2Q0FDbEksUUFBUSxLQUVWLCtEQUNFLG9CQUFxQixNQUFNLE1BRTdCLGdFQUNFLGdCQUFnQixVQUVsQixzQ0FBa0YsNkNBQTVDLDJDQUNwQyxRQUFRLEtBRVYsdURBQ0UsTUFBTSxRQUNOLFlBQVksSUFBSSxFQUFJLElBQUksQ0FBQyxLQUFLLEVBQUksSUFBSSxDQUFDLEVBQUksS0FBSyxJQUFJLENBQUMsRUFBSSxJQUFJLEtBRS9ELGlFQUNFLE1BQU0sS0FDTixZQUFZLElBQUksRUFBSSxPQUFPLENBQUMsS0FBSyxFQUFJLE9BQU8sQ0FBQyxFQUFJLEtBQUssT0FBTyxDQUFDLEVBQUksSUFBSSxRQUV4RSx1RUFDRSxZQUFZLElBQUksRUFBSSxJQUFJLENBQUMsS0FBSyxFQUFJLElBQUksQ0FBQyxFQUFJLEtBQUssSUFBSSxDQUFDLEVBQUksSUFBSSxLQUUvRCxzRUFDRSxnQkFBZ0IsVUFFbEIsZ0NBQWdDLG1DQUM5QixTQUFVLFNBQ1YsSUFBSyxJQUNMLE1BQU8sSUFDUCxPQUFRLElBQUksTUFBTSxRQUNsQixNQUFPLFFBQ1AsVUFBVyxLQUNYLFdBQVksRUFBSSxFQUFJLElBQUksUUFDeEIsT0FBUSxRQUNSLFFBQVEsRUFDUixXQUFZLFFBQVEsSUFDcEIsVUFBVSxJQUNWLFdBQVcsS0FDWCxXQUFXLE9BRWIsbUNBQ0UsTUFBTSxLQUVSLDhDQUNFLFFBQVEsS0FFVix3REFDRSxRQUFRLEtBRVYsd0RBQ0UsUUFBUSxPQUVWLHNDQUF1Qyx5Q0FDckMsUUFBUSxFQUVWLHdCQUNFLE1BQU8sS0FDUCxXQUFZLElBQ1osU0FBVSxTQUVaLDBCQUNFLE1BQU8sSUFFVCwwQkFDRSxNQUFPLElBRVQsMEJBQ0UsTUFBTyxJQUVULDBCQUNFLE1BQU8sSUFFVCwwQkFDRSxNQUFPLElBRVQsZ0NBQ0UsWUFBYSxLQUVmLHNDQUNFLFlBQVksS0FHZCx5QkFDRSxPQUFPLElBQUksTUFBTSxLQUVuQixtQ0FDRSxRQUFRLEtBR2lDLDBDQUEzQywwQ0FDRSxPQUFPLEtBR1Qsa0NBQ0UsUUFBUSxLQUcwQyxtREFBcEQsbURBQ0ksU0FBVSxTQUNWLFFBQVEsTUFDUixNQUFPLEtBQ1AsT0FBUSxLQUNSLEtBQU0sSUFDTixJQUFLLElBQ0wsWUFBYSxNQUNiLFdBQVksTUFDWixRQUFTLEdBQ1QsV0FBWSxRQUFRLElBRXhCLHNEQUNJLFNBQVUsU0FDVixNQUFPLEtBQ1AsT0FBUSxLQUNSLEtBQU0sRUFDTixJQUFLLEVBQ0wsV0FBWSxLQUNaLGNBQWUsSUFFbkIsd0RBQ0ksU0FBVSxTQUNWLE1BQU8sS0FDUCxPQUFRLEtBQ1IsS0FBTSxLQUNOLElBQUssS0FDTCxhQUFjLEVBQUksSUFDbEIsYUFBYyxLQUNkLGFBQWMsTUFHbEIsMEJBQ0UsK0JBQ0UsUUFBUyxJQUFJLEtBQUssSUFBSSxLQUN0QixPQUFRLEtBRVYsb0NBQ0UsV0FBVyxFQUViLHNDQUNFLFdBQVcsR0FJZiwwQkFDRSxnQ0FDRSxNQUFNLElBRVIsc0NBQ0UsUUFBUSJ9 */";

  var discographyplayerSidebarCSS = "@media (min-width:1600px){#menubar-wrapper:hover{z-index:1100}#discographyplayer{display:block;bottom:0;height:100vh;max-height:100vh;width:calc((100vw - 915px - 35px)/ 2);right:0;border-left:1px solid #0007;padding-left:1px}#discographyplayer .playlist{height:calc(100vh - 80px - 80px - 50px - 13px);max-height:calc(100vh - 80px - 80px - 50px - 13px)}#discographyplayer .playlist .playlistentry{overflow-x:hidden}#discographyplayer .col25{width:98%}#discographyplayer .col.nowPlaying{height:70px}#discographyplayer .col.col25.colcontrols{height:85px}#discographyplayer .col35{width:97%}#discographyplayer .col15{width:96%}#discographyplayer .colvolumecontrols{height:50px}#bufferbar,#playhead{height:25px;border-radius:0}#discographyplayer .audioplayer a.downloadlink{position:fixed;bottom:5px;right:5px;z-index:10}#discographyplayer .minimizebutton{display:none}#discographyplayer .currentlyPlaying{transition:margin-top 1s ease-in-out;width:99%;height:99%}#discographyplayer .nextInRow{height:0%;width:99%;transition:height 1s ease-in-out}}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODEyNS9zcmMvY3NzL2Rpc2NvZ3JhcGh5cGxheWVyU2lkZWJhci5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsMEJBQ0UsdUJBQ0UsUUFBUSxLQUVWLG1CQUNFLFFBQVMsTUFDVCxPQUFRLEVBQ1IsT0FBUSxNQUNSLFdBQVksTUFDWixNQUFPLGdDQUNQLE1BQU8sRUFDUCxZQUFhLElBQUksTUFBTSxNQUN2QixhQUFjLElBRWhCLDZCQUNFLE9BQVEsd0NBQ1IsV0FBWSx3Q0FFZCw0Q0FDRSxXQUFXLE9BRWIsMEJBQ0UsTUFBTyxJQUVULG1DQUNFLE9BQVEsS0FFViwwQ0FDRSxPQUFRLEtBRVYsMEJBQ0UsTUFBTyxJQUVULDBCQUNFLE1BQU8sSUFFVCxzQ0FDRSxPQUFRLEtBRUMsV0FBWCxVQUNFLE9BQVEsS0FDUixjQUFlLEVBRWpCLCtDQUNFLFNBQVUsTUFDVixPQUFRLElBQ1IsTUFBTyxJQUNQLFFBQVMsR0FFWCxtQ0FDRSxRQUFRLEtBRVYscUNBQ0UsV0FBWSxXQUFXLEdBQUcsWUFDMUIsTUFBTSxJQUNOLE9BQU8sSUFFVCw4QkFDRSxPQUFPLEdBQ1AsTUFBTSxJQUNOLFdBQVksT0FBTyxHQUFHIn0= */";

  var pastreleasesCSS = "#pastreleases{position:fixed;bottom:1%;left:10px;background:#d5dce4;color:#033162;font-size:10pt;border:1px solid #033162;z-index:200;opacity:0;transition:opacity .7s;overflow:auto}#pastreleases .tablediv{display:table;position:relative}#pastreleases .entry,#pastreleases .header{display:table-row}#pastreleases .entry>*,#pastreleases .header>*{display:table-cell;line-height:21pt}#pastreleases .upcoming{cursor:pointer;font-size:x-small}#pastreleases .controls{cursor:pointer;position:absolute;top:0;right:1px;line-height:11pt}#pastreleases .entry:link{position:relative;border-top:1px solid #033162;color:#033162;text-decoration:none}#pastreleases .entry:nth-child(odd){background:#c5ccd4}#pastreleases .entry:hover,#pastreleases .entry:visited{color:#033162;text-decoration:none}#pastreleases .entry.future{display:none;background:#9fc2ea}#pastreleases .entry.future:nth-child(odd){background:#8fc2e1}#pastreleases .entry .image{background-size:contain;width:21pt;height:21pt}#pastreleases .entry:hover .image{display:block;position:fixed;bottom:10px;top:50%;left:50%;margin-right:-50%;transform:translate(-50%,-50%);width:350px;height:350px;background:#000;border:5px solid #fff}#pastreleases .entry time{padding-right:2px}#pastreleases .entry .title{padding-left:2px;border-left:1px solid #47a2bd;font-size:1em}#pastreleases .remove{font-family:sans-serif;color:#97174e;font-size:small;padding-right:3px}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODEyNS9zcmMvY3NzL3Bhc3RyZWxlYXNlcy5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUksY0FDRSxTQUFTLE1BQ1QsT0FBTyxHQUNQLEtBQUssS0FDTCxXQUFXLFFBQ1gsTUFBTSxRQUNOLFVBQVUsS0FDVixPQUFPLElBQUksTUFBTSxRQUNqQixRQUFRLElBQ1IsUUFBUSxFQUNSLFdBQVksUUFBUSxJQUNwQixTQUFTLEtBRVgsd0JBQ0UsUUFBUyxNQUNULFNBQVMsU0FFWCxxQkFBcUIsc0JBQ25CLFFBQVEsVUFFVix1QkFBeUIsd0JBQ3ZCLFFBQVEsV0FDUixZQUFZLEtBRWQsd0JBQ0UsT0FBTyxRQUNQLFVBQVUsUUFFWix3QkFDRSxPQUFPLFFBQ1AsU0FBUyxTQUNULElBQUksRUFDSixNQUFNLElBQ04sWUFBWSxLQUVkLDBCQUNFLFNBQVMsU0FDVCxXQUFXLElBQUksTUFBTSxRQUNyQixNQUFNLFFBQ04sZ0JBQWdCLEtBRWxCLG9DQUNFLFdBQVcsUUFFYiwyQkFBMkIsNkJBQ3pCLE1BQU0sUUFDTixnQkFBZ0IsS0FFbEIsNEJBQ0UsUUFBUSxLQUNSLFdBQVcsUUFFYiwyQ0FDRSxXQUFXLFFBRWIsNEJBQ0UsZ0JBQWdCLFFBQ2hCLE1BQU0sS0FDTixPQUFPLEtBRVQsa0NBQ0UsUUFBUSxNQUNSLFNBQVMsTUFDVCxPQUFPLEtBQ1AsSUFBSSxJQUNKLEtBQUssSUFDTCxhQUFhLEtBQ2IsVUFBVSxxQkFDVixNQUFNLE1BQ04sT0FBTyxNQUNQLFdBQVcsS0FDWCxPQUFPLElBQUksTUFBTSxLQUVuQiwwQkFDRSxjQUFlLElBRWpCLDRCQUNFLGFBQWMsSUFDZCxZQUFhLElBQUksTUFBTSxRQUN2QixVQUFXLElBRWIsc0JBQ0UsWUFBWSxXQUNaLE1BQU0sUUFDTixVQUFXLE1BQ1gsY0FBYyJ9 */";

  var darkmodeCSS = "#centerWrapper #pgBd #trackInfoInner{display:flex;flex-direction:column}#centerWrapper #pgBd #trackInfoInner>.tralbumCommands{order:1}#centerWrapper #pgBd #rightColumn{display:flex;flex-direction:column}#centerWrapper #pgBd #rightColumn>#showography{order:1}.ui-widget-overlay{display:none}.ui-dialog.ui-widget.ui-widget-content.ui-corner-all.nu-dialog.no-title{position:fixed!important;top:0!important;right:0!important;bottom:auto!important;left:auto!important}.inline_player .nextbutton,.inline_player .prevbutton,svg{filter:invert(90%)}a{color:#da5!important}.trackYear,button{color:#ac6!important}div#collection-container.collection-container,div.home{background:#000!important}div.area_text,div.sort_controls,div.text,span{color:#ccc!important}div#dlg0_h.hd,div#pgBd.yui-skin-sam,div.blogunit-details-section,div.collection-item-details-container{background:var(--pgBdColor)!important}div.collection-item-artist,h1{color:#ccc!important}DIV.track_number.secondaryText,div.collection-item-title,div.message,h2{color:#fff!important}h3{color:#ffed80!important}DIV.tralbumData.tralbum-credits{color:#ccc!important}DIV#license.info,DIV.tralbumData.tralbum-about,DIV.tralbumData.tralbum-feed,li{color:#806300!important}button.sc-button.sc-button-small.sc-button-responsive.sc-button-addtoset{color:#000!important}div#fan-suggestions.dotted-section.mine,div.bcweekly-bd,div.collection-item-gallery-container,div.collection-stats.dotted-section.mine{background:#222!important}p{color:#aaa!important}div.sound__soundActions{background:0 0!important}button.sc-button.sc-button-small.sc-button-responsive.sc-button-addtoset{color:#111!important}div.ft.fakeFt{background:#555!important}div.bd.footerless{background:#999!important}.walkthrough ol{background-color:#373737}.walkthrough .button{background:#262626;border:#262626}.fan-banner.empty.owner{background-color:#373737}#menubar,#pgFt,.menubar-outer{background-color:#26423b!important;border-bottom:dotted #000 1px!important}#menubar-wrapper{background-color:#000;border-bottom:dotted #000 1px!important}#menubar input#search-field{margin:0;height:21px;line-height:21px;width:222px;font-family:\"Helvetica Neue\",Arial,sans-serif;color:#fff;font-size:13px;padding:0 21px 0 3px;-webkit-user-select:text;text-align:center;background-color:#282828;border:1px solid #282828;outline:0;border-radius:3px}#menubar input#search-field.focused{background-color:#282828;border:1px solid #282828}#menubar.menubar-2018 .hoverable:hover{background:#11607582!important}.fan-bio .edit-profile a{border:1px solid #373737;border-radius:5px;outline:0;background:#373737;color:#aaa;font-weight:500;padding:5px 9px;font-size:11px;line-height:15px;text-transform:uppercase;display:inline-block}.grids{color:#fff;margin:0 0 100px}.recommendations-container{background-color:#373737;border-top:dotted #373737 1px}.fan-container .top.editing{border-bottom:1px solid #2a2a2a;background-color:#191919}.ui-dialog.nu-dialog .ui-dialog-titlebar{padding:15px 20px 12px;background-color:#26423b!important;border-bottom:1px solid #26423b!important}.ui-dialog-titlebar *{color:#fff!important}.ui-dialog-content{color:#ddd!important}.ui-widget-content{border:1px solid #373;background:#373737!important;color:#ddd!important}.external-follow-confirm .ui-dialog-buttonset button,.mailing-list-opt-in .ui-dialog-buttonset button{background:#26423b!important}.external-follow-confirm .ui-dialog-buttonset button:last-child,.mailing-list-opt-in.band .ui-dialog-buttonset button:last-child{background:#0002!important;border:2px solid #26423b!important}#follow-unfollow{background:0 0!important}#follow-unfollow.following{background:#26423b!important;border-color:#26423b!important}#follow-unfollow>div{color:#ac6!important}#follow-unfollow.following>div{background:#26423b!important}.app-promo-desktop,.bcdaily,.discover,.email-intake,.notable{background-color:#262626}.bcdaily .bcdaily-story{min-height:280px;background:#373737}.notable-item{background-color:#373737}.item-page{background:#373737;border:1px solid #373737}.follow-fan-btn{background-color:#373737;border:1px solid #373737}.spotlight-bio,.spotlight-button,.spotlight-link,.spotlight-location,.spotlight-name{color:#fff}.aotd-large{background:#373737}.factoid-title{color:#46c5d5}#autocomplete-results.autocompleted{background:#262626;border:1px solid #262626;color:#fff}.searchwidget.keyboard-focus input[type=text]:focus{background:#262626;box-shadow:0 0}.discover-detail-inner{background-color:#373737}body.wordpress{background:#262626}.wordpress .sidebar .textwidget{color:#fff}.wordpress h1 a{display:block;height:60px;background-size:242px 28px;background-position:24.6% 50%}p{color:#fff!important}.wordpress #content{color:#fff}#dash-container .follow-band,#dash-container .follow-discover,#dash-container .follow-fan{border:1px solid #373737;background:linear-gradient(to bottom,#373737 0,#373737 100%)}html{background:#1e1e1e!important}#stories-vm .story-innards{background-color:#373737}.pane{color:#c7c7c7}#settings-menubar{border-right:1px solid #383838}#settings-menubar li{border-left:1px solid #383838;border-bottom:1px solid #383838;border-top:1px solid #383838}.share_dialog.ui-dialog .ui-dialog-content{background-color:#262626}.share_dialog .section_head{color:#fff}.buy-dlg{color:#fff}.pg-ft{background-color:#000}#lang-picker-vm{border-radius:10px}#menubar>ul>li .logo{background:url('https://www.dropbox.com/s/8s7km8r329l7qy7/bandcamp-logo-gray.png?dl=1') 0 0 no-repeat;background-size:contain;height:20px;margin-top:15px;width:85px}.hd-logo{background:transparent url('https://www.dropbox.com/s/8s7km8r329l7qy7/bandcamp-logo-gray.png?dl=1') no-repeat;background-size:100%;margin-top:24px;height:25px;width:156px}.wordpress h1 a{display:block;text-indent:-999em;background:url('https://www.dropbox.com/s/mx80o2eenp43l0o/bandcamp-daily-retina-dark-theme.png?dl=1') no-repeat;height:60px;background-size:242px 28px;background-position:24.6% 50%}#pgBd{color:#fff}.download-bottom-area{border-top:none;background:0 0}.download .formats-container{border:1px solid #373737;background-color:#373737}.download .formats{list-style:none;color:#888;padding:0;background-color:#373737;width:170px;z-index:2;cursor:default}.download .formats li:hover{background-color:#262626}html{scrollbar-color:#222 #26423b}::-webkit-scrollbar{height:13px}::-webkit-scrollbar-thumb{background:#26423b;border:1px solid #4a4a4a}::-webkit-scrollbar-thumb:hover{background:#316d4b}::-webkit-scrollbar-thumb:active{background:#316d4b}::-webkit-scrollbar-track{background:#4a4a4a}::-webkit-scrollbar-track:hover{background:#4a4a4a}::-webkit-scrollbar-track:active{background:#4a4a4a}::-webkit-scrollbar-corner{background:#4a4a4a}body{background-color:#000!important;color:#fff!important}#propOpenWrapper{background-color:var(--propOpenWrapperBackgroundColor)!important;transition:background-color .5s}.bcdaily-thumb-img,img{filter:brightness(70%)}.bcdaily-thumb-img:hover,img:hover{filter:none}img.imageviewer_image{filter:none}.bclogo svg{filter:brightness(60%)}.inline_player .playbutton.busy::after{opacity:.3;background-image:url('https://bandcamp.com/img/loading-dark.gif')}.inline_player .nextsongcontrolbutton,.inline_player .playbutton,.inline_player .volumeButton,.track_list .play_status{background-color:#686868;border-color:#595959}.nextsongcontrolbutton .nextsongcontrolicon{filter:drop-shadow(#090909b3 1px 1px 2px)}.nextsongcontrolbutton.active .nextsongcontrolicon{filter:drop-shadow(#a3f204 1px 1px 2px)!important}.hidden .nextsongcontrolbutton{display:none}.inline_player .progbar .thumb{background-color:#000;border-color:#ccc}.inline_player .nextbutton,.inline_player .prevbutton{opacity:.7}.track_list tr.lyricsRow td[colspan] div{color:#f8f8f8}input[type=password],input[type=text],textarea{background-color:#121f12!important;color:#40b333!important}.carousel-player-inner{background-color:#26423b}.carousel-player-inner .progress-bar{background-color:#26423b}#carousel-player .queue.show{background-color:#26423b}#carousel-player .queue.show li.active{background-color:#528679}#autocomplete-results .see-all{background-color:#f3f3f345!important}.deluxemenu{color:#c9ebfb!important;background:#00042f!important}.deluxemenu button{background:#1c1494}.deluxeexportmenu table tr>td{color:#00a1c6!important}.deluxeexportmenu table tr>td:nth-child(3){color:#006bc6!important}.deluxemenu fieldset{border:1px solid #fffa!important;box-shadow:1px 1px 3px #fff5!important}.deluxemenu fieldset legend{color:#fffa!important}#discographyplayer{background-color:#26423b!important;color:#869593!important}#discographyplayer .playlist{background:#26423b!important}#discographyplayer .playlist .playing{background:#619aa9db!important}#timeline{background:rgba(34,57,42,.69)!important}#bufferbar{background:rgba(77,79,76,.59)!important}#playhead{background:#2a6c21!important}#discographyplayer .playlist{scrollbar-color:#222 #26423b!important}#discographyplayer_contextmenu{box-shadow:#ffffff50 2px 2px 2px;background-color:#162d27;border:#619aa9 2px solid;color:#c2aa4a}#discographyplayer_contextmenu .contextmenu_submenu{cursor:pointer;padding:2px;background-color:#162d27;color:#c2aa4a;border:1px solid transparent}#discographyplayer_contextmenu .contextmenu_submenu:hover{background-color:#619aa9;color:#fff;border:1px solid #fff}#band-navbar{background-color:#333!important}.hd.corp-home{background-color:#26423b}#hub .bd-section.top-section{opacity:.8}#s-daily{background:#262626!important}.franchise-description{color:#d7d072}.footer-gradient{background-image:linear-gradient(to bottom,#262626,#5e5e5e)}#s-daily dailyfooter{background-color:#5e5e5e}#s-daily dailyfooter h2{-webkit-text-stroke:2px #257110!important}#s-daily a.pagination-link{-webkit-text-stroke:2px #257110!important}#s-daily a.pagination-link .back-text{-webkit-text-stroke:2px #1c6c3f!important}article-title{color:#e3e3e3}.mpmerchformats{color:#909090}article-footer{color:#909090}article>article-end{filter:invert(75%)}article .icon{filter:invert(50%)}.salesfeed .item-inner:hover{background-color:#0e738c!important}.hd.header-rework-2018 .hd-sub-head .blue-gradient{background:-webkit-linear-gradient(left,#da5,#daf)!important}.factoid .dots{filter:brightness(300%)}.bdp_check_onlinkhover_container_shown{background-color:#26423ba8!important}.bdp_check_onlinkhover_container:hover{background-color:#2d7d39a8!important;box-shadow:#2db91f7a 0 0 5px}#pastreleases{background-color:#154a86!important}#pastreleases .entry:nth-child(odd){background-color:#3e6c9f!important}#pastreleases .entry.future{background-color:#4783c8!important}#pastreleases .entry.future:nth-child(odd){background-color:#11447d!important}#queueloadingindicator{background-color:#154a86!important}.sidebar .shortcuts{background:#0000;border-color:#0000}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODEyNS9zcmMvY3NzL2Rhcmttb2RlLmNzcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFNQSxxQ0FDSSxRQUFTLEtBQ1QsZUFBZ0IsT0FFcEIsc0RBQ0ksTUFBTyxFQUdYLGtDQUNJLFFBQVMsS0FDVCxlQUFnQixPQUVwQiwrQ0FDSSxNQUFPLEVBSVgsbUJBQ0ksUUFBUyxLQUViLHdFQUNJLFNBQVUsZ0JBQ1YsSUFBSyxZQUNMLE1BQU8sWUFDUCxPQUFRLGVBQ1IsS0FBTSxlQUVWLDJCQUNBLDJCQUNBLElBQ0ksT0FBUSxZQUVaLEVBQ0ksTUFBTyxlQUVYLFdBQ0EsT0FDSSxNQUFPLGVBRVgsOENBQ0EsU0FDSSxXQUFZLGVBRWhCLGNBQ0Esa0JBQ0EsU0FDQSxLQUNJLE1BQU8sZUFFWCxjQUNBLHNCQUNBLDZCQUNBLHNDQUNJLFdBQVksMkJBRWhCLDJCQUNBLEdBQ0ksTUFBTyxlQUVYLCtCQUNBLDBCQUNBLFlBQ0EsR0FDSSxNQUFPLGVBRVgsR0FDSSxNQUFPLGtCQUVYLGdDQUNJLE1BQU8sZUFFWCxpQkFDQSw4QkFDQSw2QkFDQSxHQUNJLE1BQU8sa0JBRVgseUVBQ0ksTUFBTyxlQUVYLHdDQUNBLGdCQUNBLHNDQUNBLHlDQUNJLFdBQVksZUFFaEIsRUFDSSxNQUFPLGVBRVgsd0JBQ0ksV0FBWSxjQUVoQix5RUFDSSxNQUFPLGVBRVgsY0FDSSxXQUFZLGVBRWhCLGtCQUNJLFdBQVksZUFFaEIsZ0JBQ0ksaUJBQWtCLFFBRXRCLHFCQUNJLFdBQVksUUFDWixPQUFRLFFBRVosd0JBQ0ksaUJBQWtCLFFBRXRCLFNBQ0EsTUFDQSxlQUNJLGlCQUFrQixrQkFDbEIsY0FBZSxPQUFPLEtBQUssY0FFL0IsaUJBQ0ksaUJBQWtCLEtBQ2xCLGNBQWUsT0FBTyxLQUFLLGNBRS9CLDRCQUNJLE9BQVEsRUFDUixPQUFRLEtBQ1IsWUFBYSxLQUNiLE1BQU8sTUFDUCxZQUFhLGdCQUFnQixDQUFFLEtBQUssQ0FBRSxXQUN0QyxNQUFPLEtBQ1AsVUFBVyxLQUNYLFFBQVMsRUFBRSxLQUFLLEVBQUUsSUFDbEIsb0JBQXFCLEtBQ3JCLFdBQVksT0FDWixpQkFBa0IsUUFDbEIsT0FBUSxJQUFJLE1BQU0sUUFDbEIsUUFBUyxFQUNULGNBQWUsSUFFbkIsb0NBQ0ksaUJBQWtCLFFBQ2xCLE9BQVEsSUFBSSxNQUFNLFFBRXRCLHVDQUNFLFdBQVcsb0JBR2IseUJBQ0ksT0FBUSxJQUFJLE1BQU0sUUFDbEIsY0FBZSxJQUNmLFFBQVMsRUFDVCxXQUFZLFFBQ1osTUFBTyxLQUNQLFlBQWEsSUFDYixRQUFTLElBQUksSUFDYixVQUFXLEtBQ1gsWUFBYSxLQUNiLGVBQWdCLFVBQ2hCLFFBQVMsYUFFYixPQUNJLE1BQU8sS0FDUCxPQUFRLEVBQUUsRUFBRSxNQUVoQiwyQkFDSSxpQkFBa0IsUUFDbEIsV0FBWSxPQUFPLFFBQVEsSUFFL0IsNEJBQ0ksY0FBZSxJQUFJLE1BQU0sUUFDekIsaUJBQWtCLFFBRXRCLHlDQUNJLFFBQVMsS0FBSyxLQUFLLEtBQ25CLGlCQUFrQixrQkFDbEIsY0FBZSxJQUFJLE1BQU0sa0JBRTdCLHNCQUNJLE1BQU8sZUFFWCxtQkFDSSxNQUFNLGVBRVYsbUJBQ0ksT0FBUSxJQUFJLE1BQU0sS0FDbEIsV0FBWSxrQkFDWixNQUFNLGVBR1YscURBQXNELGlEQUNsRCxXQUFXLGtCQUVmLGdFQUFpRSxpRUFDN0QsV0FBVyxnQkFDWCxPQUFRLElBQUksTUFBTSxrQkFHdEIsaUJBQ0UsV0FBWSxjQUVkLDJCQUNFLFdBQVksa0JBQ1osYUFBYyxrQkFFaEIscUJBQ0UsTUFBTSxlQUVSLCtCQUNFLFdBQVksa0JBR2QsbUJBQ0EsU0FDQSxVQUNBLGNBQ0EsU0FDSSxpQkFBa0IsUUFFdEIsd0JBQ0ksV0FBWSxNQUNaLFdBQVksUUFFaEIsY0FDSSxpQkFBa0IsUUFFdEIsV0FDSSxXQUFZLFFBQ1osT0FBUSxJQUFJLE1BQU0sUUFFdEIsZ0JBQ0ksaUJBQWtCLFFBQ2xCLE9BQVEsSUFBSSxNQUFNLFFBRXRCLGVBQ0Esa0JBQ0EsZ0JBQ0Esb0JBQ0EsZ0JBQ0ksTUFBTyxLQUVYLFlBQ0ksV0FBWSxRQUVoQixlQUNJLE1BQU8sUUFFWCxvQ0FDSSxXQUFZLFFBQ1osT0FBUSxJQUFJLE1BQU0sUUFDbEIsTUFBTyxLQUVYLG9EQUNJLFdBQVksUUFDWixXQUFZLEVBQUUsRUFFbEIsdUJBQ0ksaUJBQWtCLFFBRXRCLGVBQ0ksV0FBWSxRQUVoQixnQ0FDSSxNQUFPLEtBRVgsZ0JBQ0ksUUFBUyxNQUNULE9BQVEsS0FDUixnQkFBaUIsTUFBTSxLQUN2QixvQkFBcUIsTUFBTSxJQUUvQixFQUNJLE1BQU8sZUFFWCxvQkFDSSxNQUFPLEtBRVgsNkJBQ0EsaUNBQ0EsNEJBQ0ksT0FBUSxJQUFJLE1BQU0sUUFDbEIsV0FBWSxrREFFaEIsS0FDSSxXQUFZLGtCQUVoQiwyQkFDSSxpQkFBa0IsUUFFdEIsTUFDSSxNQUFPLFFBRVgsa0JBQ0ksYUFBYyxJQUFJLE1BQU0sUUFFNUIscUJBQ0ksWUFBYSxJQUFJLE1BQU0sUUFDdkIsY0FBZSxJQUFJLE1BQU0sUUFDekIsV0FBWSxJQUFJLE1BQU0sUUFFMUIsMkNBQ0ksaUJBQWtCLFFBRXRCLDRCQUNJLE1BQU8sS0FFWCxTQUNJLE1BQU8sS0FHWCxPQUNJLGlCQUFrQixLQUd0QixnQkFDSSxjQUFjLEtBR2xCLHFCQUNJLFdBQVksNkVBQTZFLEVBQUUsRUFBRSxVQUM3RixnQkFBaUIsUUFDakIsT0FBUSxLQUNSLFdBQVksS0FDWixNQUFPLEtBRVgsU0FDSSxXQUFZLFlBQVksNkVBQTZFLFVBQ3JHLGdCQUFpQixLQUNqQixXQUFZLEtBQ1osT0FBUSxLQUNSLE1BQU8sTUFFWCxnQkFDSSxRQUFTLE1BQ1QsWUFBYSxPQUNiLFdBQVksMkZBQTJGLFVBQ3ZHLE9BQVEsS0FDUixnQkFBaUIsTUFBTSxLQUN2QixvQkFBcUIsTUFBTSxJQUUvQixNQUNJLE1BQU8sS0FFWCxzQkFDSSxXQUFZLEtBQ1osV0FBWSxJQUVoQiw2QkFDSSxPQUFRLElBQUksTUFBTSxRQUNsQixpQkFBa0IsUUFFdEIsbUJBQ0ksV0FBWSxLQUNaLE1BQU8sS0FDUCxRQUFTLEVBQ1QsaUJBQWtCLFFBQ2xCLE1BQU8sTUFDUCxRQUFTLEVBQ1QsT0FBUSxRQUVaLDRCQUNJLGlCQUFrQixRQUd0QixLQUNFLGdCQUFpQixLQUFLLFFBR3hCLG9CQUNFLE9BQVEsS0FFViwwQkFDRSxXQUFZLFFBQ1osT0FBTyxJQUFJLE1BQU0sUUFFbkIsZ0NBQ0UsV0FBWSxRQUVkLGlDQUNFLFdBQVksUUFFZCwwQkFDRSxXQUFZLFFBRWQsZ0NBQ0UsV0FBWSxRQUVkLGlDQUNFLFdBQVksUUFFZCwyQkFDRSxXQUFZLFFBR2QsS0FDRSxpQkFBaUIsZUFDakIsTUFBTSxlQUdSLGlCQUNFLGlCQUFrQixnREFDbEIsV0FBVyxpQkFBaUIsSUFHMUIsbUJBQUosSUFDSSxPQUFPLGdCQUVELHlCQUFWLFVBQ0ksT0FBTyxLQUVYLHNCQUNJLE9BQU8sS0FHWCxZQUNFLE9BQU8sZ0JBR1QsdUNBQ0UsUUFBUSxHQUNSLGlCQUFpQixpREFLbkIsc0NBRkEsMkJBQ0EsNkJBRUEseUJBQ0UsaUJBQWlCLFFBQ2pCLGFBQWEsUUFHZiw0Q0FDRSxPQUFPLG1DQUVULG1EQUNFLE9BQU8sMkNBR1QsK0JBQ0UsUUFBUSxLQUdWLCtCQUNFLGlCQUFpQixLQUNqQixhQUFhLEtBR2YsMkJBQTRCLDJCQUMxQixRQUFRLEdBRVYseUNBQ0UsTUFBTyxRQUdRLHFCQUFqQixpQkFBc0MsU0FDcEMsaUJBQWlCLGtCQUNqQixNQUFNLGtCQUdSLHVCQUNFLGlCQUFpQixRQUVuQixxQ0FDRSxpQkFBaUIsUUFFbkIsNkJBQ0UsaUJBQWlCLFFBRW5CLHVDQUNFLGlCQUFpQixRQUduQiwrQkFDRSxpQkFBa0Isb0JBR3BCLFlBQ0UsTUFBTyxrQkFDUCxXQUFZLGtCQUVkLG1CQUNFLFdBQVksUUFFZCw4QkFDRSxNQUFPLGtCQUVULDJDQUNFLE1BQU0sa0JBRVIscUJBQ0UsT0FBUSxJQUFJLE1BQU0sZ0JBQ2xCLFdBQVksSUFBSSxJQUFJLElBQUksZ0JBRTFCLDRCQUNFLE1BQU8sZ0JBR1QsbUJBQ0UsaUJBQWlCLGtCQUNqQixNQUFNLGtCQUVSLDZCQUNFLFdBQVksa0JBRWQsc0NBQ0UsV0FBWSxvQkFFZCxVQUNJLFdBQVksNkJBRWhCLFdBQ0UsV0FBWSw2QkFFZCxVQUNFLFdBQVksa0JBRWQsNkJBQ0UsZ0JBQWlCLEtBQUssa0JBR3hCLCtCQUNFLFdBQVksVUFBVSxJQUFJLElBQUksSUFDOUIsaUJBQWlCLFFBQ2pCLE9BQVEsUUFBUSxJQUFJLE1BQ3BCLE1BQU8sUUFFVCxvREFDRSxPQUFPLFFBQ1AsUUFBUSxJQUNSLGlCQUFpQixRQUNqQixNQUFPLFFBQ1AsT0FBUSxJQUFJLE1BQU0sWUFFcEIsMERBQ0UsaUJBQWlCLFFBQ2pCLE1BQU0sS0FDTixPQUFRLElBQUksTUFBTSxLQUlwQixhQUNJLGlCQUFrQixlQUd0QixjQUNFLGlCQUFpQixRQUVuQiw2QkFDRSxRQUFRLEdBR1YsU0FDSSxXQUFZLGtCQUVoQix1QkFDRSxNQUFPLFFBRVQsaUJBQ0UsaUJBQWlCLDJDQUVuQixxQkFDRSxpQkFBaUIsUUFFbkIsd0JBQ0Usb0JBQXFCLElBQUksa0JBRTNCLDJCQUNFLG9CQUFxQixJQUFJLGtCQUUzQixzQ0FDRSxvQkFBcUIsSUFBSSxrQkFFM0IsY0FDRSxNQUFPLFFBRVQsZ0JBQ0UsTUFBTSxRQUVSLGVBQ0UsTUFBTSxRQUVSLG9CQUNFLE9BQU8sWUFFVCxjQUNJLE9BQVEsWUFHWiw2QkFDSSxpQkFBa0Isa0JBR3RCLG1EQUNFLFdBQVksa0RBRWQsZUFDRSxPQUFPLGlCQUdULHVDQUNFLGlCQUFpQixvQkFFbkIsdUNBQ0UsaUJBQWlCLG9CQUNqQixXQUFZLFVBQVUsRUFBSSxFQUFJLElBUWhDLGNBQ0UsaUJBQWlCLGtCQUVuQixvQ0FDRSxpQkFBaUIsa0JBRW5CLDRCQUNFLGlCQUFpQixrQkFFbkIsMkNBQ0UsaUJBQWlCLGtCQUduQix1QkFDRSxpQkFBaUIsa0JBS25CLG9CQUNFLFdBQVcsTUFDWCxhQUFhIn0= */";

  var geniusCSS = "#myconfigwin39457845{z-index:2060!important;position:fixed!important}#myconfigwin39457845 h1{margin:5px}#myconfigwin39457845 .divAutoShow{display:none}#myconfigwin39457845 button{background-color:#cacaca!important;color:#000!important;border:2px outset!important;padding:1px!important;font-size:1.2em!important}#lyricsiframe{opacity:.1;transition:opacity 2s;margin:0;padding:0;position:relative}.lyricsnavbar{font-size:.7em;text-align:right;padding:0 10px 0 0!important}.lyricsnavbar a:link,.lyricsnavbar a:visited,.lyricsnavbar span{color:#606060;text-decoration:none;transition:color .4s}.lyricsnavbar a:hover,.lyricsnavbar span:hover{color:#9026e0;text-decoration:none}.loadingspinner{color:#000;font-size:12px;line-height:15px;width:15px!important;height:15px!important;padding:2px!important}.loadingspinnerholder{z-index:10;cursor:progress;position:relative;width:20px!important;height:20px!important}.searchresultlist{margin:0!important;padding:0!important;border:1px solid #000;border-radius:3px;width:450px!important}.searchresultlist ol{list-style:none;padding:0!important;margin:0}.searchresultlist ol li div{width:auto!important}\n/*# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImh0dHA6Ly9sb2NhbGhvc3Q6ODEyNS9zcmMvY3NzL2dlbml1cy5jc3MiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQ0UscUJBQ0UsUUFBUSxlQUNSLFNBQVMsZ0JBRVgsd0JBQ0UsT0FBTyxJQUVULGtDQUNFLFFBQVEsS0FFViw0QkFDRSxpQkFBa0Isa0JBQ2xCLE1BQU8sZUFDUCxPQUFRLElBQUksaUJBQ1osUUFBUyxjQUNULFVBQVcsZ0JBRWIsY0FDRSxRQUFRLEdBQ1IsV0FBVyxRQUFRLEdBQ25CLE9BQU8sRUFDUCxRQUFRLEVBQ1IsU0FBUyxTQUVYLGNBQ0UsVUFBWSxLQUNaLFdBQVcsTUFDWCxRQUFTLEVBQUksS0FBSyxFQUFJLFlBRUwscUJBQXFCLHdCQUF4QyxtQkFDRSxNQUFNLFFBQ04sZ0JBQWdCLEtBQ2hCLFdBQVcsTUFBTSxJQUVuQixzQkFBc0IseUJBQ3BCLE1BQU0sUUFDTixnQkFBZ0IsS0FFbEIsZ0JBQ0ksTUFBTSxLQUNOLFVBQVUsS0FDVixZQUFZLEtBQ1osTUFBTSxlQUNOLE9BQU8sZUFDUCxRQUFTLGNBRWIsc0JBQ0UsUUFBUSxHQUNSLE9BQU8sU0FDUCxTQUFTLFNBQ1QsTUFBTSxlQUNOLE9BQU8sZUFFVCxrQkFDRSxPQUFPLFlBQ1AsUUFBUSxZQUNSLE9BQU8sSUFBSSxNQUFNLEtBQ2pCLGNBQWUsSUFDZixNQUFPLGdCQUVULHFCQUNFLFdBQVksS0FDWixRQUFTLFlBQ1QsT0FBTyxFQUtULDRCQUNFLE1BQU8ifQ== */";

  var exportMenuHTML = "<h2>Export played albums</h2>\n  <h1 class=\"drophint\">Drop to restore from backup</h1>\n  Available fields per album:<br>\n  <table>\n    <tr>\n      <td>%artist%</td>\n      <td>Artist name</td>\n      <td>Jay-X</td>\n    </tr>\n    <tr>\n      <td>%title%</td>\n      <td>Song title</td>\n      <td>Classic song</td>\n    </tr>\n    <tr>\n      <td>%cover%</td>\n      <td>Cover image url</td>\n      <td>https://f4.bcbits.com/img/a2588527047_2.jpg</td>\n    </tr>\n    <tr>\n      <td>%url%</td>\n      <td>Album url</td>\n      <td>petrolgirls.bandcamp.com/album/cut-stitch</td>\n    </tr>\n    <tr>\n      <td>%releaseDate% / %releaseUnix% / %releaseTimestamp%</td>\n      <td>Release date</td>\n      <td>2019-02-07T14:01:59.100Z / 1549548119 / 1549548119100</td>\n    </tr>\n    <tr>\n      <td>%listenedDate% / %listenedUnix% / %listenedTimestamp%</td>\n      <td>Played/Listened date</td>\n      <td>2019-02-07T02:17:21.315Z / 1549505841 / 1549505841315</td>\n    </tr>\n    <tr>\n      <td>%releaseY% / %releaseYYYY%</td>\n      <td>Release: Year</td>\n      <td>19 / 2019</td>\n    </tr>\n    <tr>\n      <td>%releaseM% / %releaseMM% / %releaseMon% / %releaseMonth%</td>\n      <td>Release: Month</td>\n      <td>2 / 02 / Feb / February</td>\n    </tr>\n    <tr>\n      <td>%releaseD% / %releaseDD%</td>\n      <td>Release: Day of month</td>\n      <td>7 / 07</td>\n    </tr>\n    <tr>\n      <td>%releaseDay%</td>\n      <td>Release: Day of week</td>\n      <td>Friday</td>\n    </tr>\n    <tr>\n      <td>%listenedY% / %listenedYYYY%</td>\n      <td>Played: Year</td>\n      <td>19 / 2019</td>\n    </tr>\n    <tr>\n      <td>%listenedM% / %listenedMM% / %listenedMon% / %listenedMonth%</td>\n      <td>Played: Month</td>\n      <td>2 / 02 / Feb / February</td>\n    </tr>\n    <tr>\n      <td>%listenedD% / %listenedDD%</td>\n      <td>Played: Day of month</td>\n      <td>7 / 07</td>\n    </tr>\n    <tr>\n      <td>%listenedDay%</td>\n      <td>Played: Day of week</td>\n      <td>Friday</td>\n    </tr>\n\n  </table>\n";

  var speakerIconMuteSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAoAQMAAACCSesyAAAABlBMVEUAAAA1NTVzRZghAAAAAXRSTlMAQObYZgAAAK1JREFUGNMtzzEOwjAMBdAgJMKWlYlcpGqvxVC1zgl6A3qRSmXrNYo6dE3FQCRCzXeCl+cvefBXB1Iyx0fiMOukNyTcKpJcVCT5asngzHRkZqX0RKtHWtwL2M19gmIO7ivEIkawl43AtqmFrmqEaUwsfSlsmZAZbOKe6f90jTBOCX5mfC3sITHEQnD7RbWAz/iM3RvvaqZ1RjMm49EFBNCSicCSLgHaWaCxAczpB9BXgdGWyYXIAAAAAElFTkSuQmCC";

  var speakerIconLowSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAoCAMAAACPWYlDAAAAM1BMVEUAAABqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampPcCe2AAAAEHRSTlMAN4Xs4SoS0bxHeJEgpm5gLbFq2AAAALlJREFUOMvF1MsKwzAMRNGxKz+bx/z/1xYl0EJIQLPqXUSLcBAmOLivFCiNRmbEy/QqgtXOo4RYxSiBjZTASgksnRIoRg1MRsB8feMFpIR695UeSp1sS4mD4Y9WhQ1vf74FgEMUAaD7CgUMkk0B1WcVAI5DqBuScgYVrD6XOCg+DHHQfcw4yOeCMNhPFgfHi025D5vZhAJw38i/HsBzWQXYVYDURIC6igCYKsAwXi5O6J9sUMrWEv7VB3zHKzcAIgoLAAAAAElFTkSuQmCC";

  var speakerIconMiddleSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAoCAMAAACPWYlDAAAANlBMVEUAAABqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqamrDZ907AAAAEXRSTlMANoQS7CRH3nPQtpDAnFSpYGW9KtUAAAEQSURBVDjLxZTbloMwCEUhhNy8lf//2elAx+XKNJU8db9EXW6JBxTegwwz7FUkgJ8gTyKBE1pFQfCBWaaEIjIlbNILjARDuEkvFJGYeHR/ll5gDQx5GGcvJD3MdDFCPJFOQCSyixvR4LFXoYlU3l8nfC/obipZzg0cFRZ5soA1nulesKYw6lnxCNC0RLU9OQQNNf8NLzkE+l3J9uQSQNNSTdhdoZiAHiGZ4K9w6Op/BxRNabHFIay6I5u/w9EHy/81TDvdCg+xULMOoWP4gs1eswIOAUuOgYKcBTyNA4s08kVI4WT4TScYEP4JmukGQx6xEwBrXOADWC+CCzomBKPMCpDipAC86u8R/FDIFeFb/AD0fTaBQdge8wAAAABJRU5ErkJggg==";

  var speakerIconHighSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAoCAMAAACPWYlDAAAAOVBMVEUAAABqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampqampHCtmUAAAAEnRSTlMAhTXgE+5yutBAH0yQKqibV2MOLOh8AAABXElEQVQ4y8WUW5aEIAxEeb/UVrP/xc5Mimk9IGn96vrhiLmkCBB1rWVRTzQlIv0gfqZfeXeeKkK4i8Qyx1S2ZLdRvLHUATw1XccHog4oxB4x0WilFijZIQMl14WXSC0QiPw0YWbuim+pBRaY2etU578DsLYtsPriKP8WNYDJqnhEOiT/O39NA+VIlMpWPzBqCZhQGfiMKrE3CTAzKoPKFYBGAhQTS+avUDCIgIqcIp08rTIwsW0N9y9wIuDYPTw5DkwyoLhaDkcQkOhzhlCB/QaQT0C5kQH7zOb2HhasOWOIn6sUcVQeF9Xi4AUA9a+XaTMYBGDHFcTKqcYVAdDnuxf+L4hkKVir62+rAjgRwJuGMePf3TDrQ6M3HWCs77e6A/gtR6epJmi1+wZQOfmVNzBoliY1AKfxl30Mcq8LoPaBgUIHqIjOOlI+mlaVm9PaxPc92aon0jZl9S39AOlqRk93STxjAAAAAElFTkSuQmCC";

  /* globals GM, GM_addStyle, GM_download, GM_setClipboard, unsafeWindow, MouseEvent, JSON5, MediaMetadata, Response, geniusLyrics, Blob */

  // TODO Mark as played automatically when played
  // TODO custom CSS

  const BACKUP_REMINDER_DAYS = 35;
  const TRALBUM_CACHE_HOURS = 2;
  let NOTIFICATION_TIMEOUT = 3000;
  const CHROME = navigator.userAgent.indexOf('Chrome') !== -1;
  const CAMPEXPLORER = document.location.hostname === 'campexplorer.io';
  const BANDCAMPDOMAIN = document.location.hostname === 'bandcamp.com' || document.location.hostname.endsWith('.bandcamp.com');
  let BANDCAMP = BANDCAMPDOMAIN;
  const NOEMOJI = CHROME && navigator.userAgent.match(/Windows (NT)? [4-9]/i);
  const DEFAULTSKIPTIME = 10; /* Seek time to skip in seconds by default */
  const SCRIPT_NAME = 'Bandcamp script (Deluxe Edition)';
  const LYRICS_EMPTY_PATH = '/robots.txt';
  const PLAYER_URL = 'https://bandcamp.com/robots.txt?player';
  let darkModeInjected = false;
  let storeTralbumDataPermanentlySwitch = true;
  const allFeatures = {
    discographyplayer: {
      name: 'Enable player on discography page',
      default: true
    },
    tagSearchPlayer: {
      name: 'Enable custom player on tag search page',
      default: true
    },
    albumPageVolumeBar: {
      name: 'Enable volume slider/shuffle/repeat on album page',
      default: true
    },
    albumPageAutoRepeatAll: {
      name: 'Always "repeat all" on album page',
      default: false
    },
    albumPageLyrics: {
      name: 'Show lyrics from genius.com on album page',
      default: true
    },
    markasplayed: {
      name: 'Show "mark as played" link on discography player',
      default: true
    },
    markasplayedEverywhere: {
      name: 'Show "mark as played" link everywhere',
      default: true
    },
    /* markasplayedAuto: {
      name: '(NOT YET IMPLEMENTED) Automatically "mark as played" once a song was played for',
      default: false
    }, */
    thetimehascome: {
      name: 'Circumvent "The time has come to open thy wallet" limit',
      default: true
    },
    albumPageDownloadLinks: {
      name: 'Show download links on album page',
      default: true
    },
    discographyplayerDownloadLink: {
      name: 'Show download link on discography player',
      default: true
    },
    discographyplayerSidebar: {
      name: 'Show discography player as a sidebar on the right',
      default: false
    },
    discographyplayerFullHeightPlaylist: {
      name: 'Extend discography player playlist to full screen height on mouse over',
      default: true
    },
    discographyplayerPersist: {
      name: 'Recover discography player on next page',
      default: true
    },
    backupReminder: {
      name: 'Remind me to backup my played albums every month',
      default: true
    },
    nextSongNotifications: {
      name: 'Show a notification when a new song starts',
      default: false
    },
    releaseReminder: {
      name: 'Show new releases that I have saved',
      default: true
    },
    keepLibrary: {
      name: 'Store all visited or played albums',
      default: true
    },
    darkMode: {
      name: (CHROME ? '🅳🅐🆁🅺🅼🅞🅳🅴' : '🅳🅰🆁🅺🅼🅾🅳🅴') + ' - enable <a href="https://userstyles.org/styles/171538/bandcamp-in-dark">dark theme by Simonus</a>',
      default: false
    },
    showAlbumID: {
      name: 'Show album ID on album page',
      default: false
    },
    feedShowOnlyNewReleases: {
      name: 'Show only new releases in the feed',
      default: false
    },
    feedShowAudioControls: {
      name: 'Show play/pause/seek-bar in the feed',
      default: true
    },
    customReleaseDateFormat: {
      name: 'Format release date on album page',
      default: false
    }
  };
  const moreSettings = {
    darkMode: {
      true: async function populateDarkModeSettings(container) {
        let darkModeValue = await GM.getValue('darkmode', '1');
        const onChange = async function () {
          const input = this;
          window.setTimeout(() => parentQuery(input, 'fieldset').classList.add('breathe'), 0);
          document.getElementById('bcsde_mode_auto_status').innerHTML = '';
          document.getElementById('bcsde_mode_const_time_from').classList.remove('errorblink');
          document.getElementById('bcsde_mode_const_time_to').classList.remove('errorblink');
          if (document.getElementById('bcsde_mode_always').checked) {
            darkModeValue = '1';
          } else if (document.getElementById('bcsde_mode_const_time').checked) {
            let from = document.getElementById('bcsde_mode_const_time_from').value;
            let to = document.getElementById('bcsde_mode_const_time_to').value;
            const mFrom = from.match(/([0-2]?\d:[0-5]\d)/);
            const mTo = to.match(/([0-2]?\d:[0-5]\d)/);
            if (mFrom && mTo) {
              from = mFrom[1];
              to = mTo[1];
              document.getElementById('bcsde_mode_const_time_from').value = from;
              document.getElementById('bcsde_mode_const_time_to').value = to;
              darkModeValue = `2#${from}->${to}`;
            } else {
              if (!mFrom) {
                document.getElementById('bcsde_mode_const_time_from').classList.add('errorblink');
              }
              if (!mTo) {
                document.getElementById('bcsde_mode_const_time_to').classList.add('errorblink');
              }
            }
          } else if (document.getElementById('bcsde_mode_auto').checked) {
            let myPosition = null;
            let sunData = null;
            try {
              myPosition = await getGPSLocation();
              sunData = suntimes(new Date(), myPosition.latitude, myPosition.longitude);
            } catch (e) {
              document.getElementById('bcsde_mode_auto_status').innerHTML = 'Error:\n' + e;
            }
            if (myPosition && sunData) {
              const data = Object.assign(myPosition, sunData);
              darkModeValue = '3#' + JSON.stringify(data);
              document.getElementById('bcsde_mode_auto_status').innerHTML = `Source:   ${data.source}
Location: ${data.latitude}, ${data.longitude}
Sunrise:  ${data.sunrise.toLocaleTimeString()}
Sunset:   ${data.sunset.toLocaleTimeString()}`;
            }
          }
          await GM.setValue('darkmode', darkModeValue);
          window.setTimeout(() => parentQuery(input, 'fieldset').classList.remove('breathe'), 50);
        };
        const radioAlways = container.appendChild(document.createElement('input'));
        radioAlways.setAttribute('type', 'radio');
        radioAlways.setAttribute('name', 'mode');
        radioAlways.setAttribute('value', 'always');
        radioAlways.setAttribute('id', 'bcsde_mode_always');
        radioAlways.checked = darkModeValue.startsWith('1');
        radioAlways.addEventListener('change', onChange);
        const labelAlways = container.appendChild(document.createElement('label'));
        labelAlways.setAttribute('for', 'bcsde_mode_always');
        labelAlways.appendChild(document.createTextNode('Always'));
        container.appendChild(document.createElement('br'));
        const radioConstTime = container.appendChild(document.createElement('input'));
        radioConstTime.setAttribute('type', 'radio');
        radioConstTime.setAttribute('name', 'mode');
        radioConstTime.setAttribute('value', 'const_time');
        radioConstTime.setAttribute('id', 'bcsde_mode_const_time');
        radioConstTime.checked = darkModeValue.startsWith('2');
        radioConstTime.addEventListener('change', onChange);
        let [from, to] = ['22:00', '06:00'];
        if (darkModeValue.startsWith('2')) {
          [from, to] = darkModeValue.substring(2).split('->');
        }
        const labelConstTime = container.appendChild(document.createElement('label'));
        labelConstTime.setAttribute('for', 'bcsde_mode_const_time');
        labelConstTime.appendChild(document.createTextNode('Time'));
        const labelConstTimeFrom = container.appendChild(document.createElement('label'));
        labelConstTimeFrom.setAttribute('for', 'bcsde_mode_const_time_from');
        labelConstTimeFrom.appendChild(document.createTextNode(' from '));
        const inputConstTimeFrom = container.appendChild(document.createElement('input'));
        inputConstTimeFrom.setAttribute('type', 'text');
        inputConstTimeFrom.setAttribute('value', from);
        inputConstTimeFrom.setAttribute('id', 'bcsde_mode_const_time_from');
        inputConstTimeFrom.addEventListener('change', onChange);
        const labelConstTimeTo = container.appendChild(document.createElement('label'));
        labelConstTimeTo.setAttribute('for', 'bcsde_mode_const_time_to');
        labelConstTimeTo.appendChild(document.createTextNode(' to '));
        const inputConstTimeTo = container.appendChild(document.createElement('input'));
        inputConstTimeTo.setAttribute('type', 'text');
        inputConstTimeTo.setAttribute('value', to);
        inputConstTimeTo.setAttribute('id', 'bcsde_mode_const_time_to');
        inputConstTimeTo.addEventListener('change', onChange);
        container.appendChild(document.createElement('br'));
        const radioAuto = container.appendChild(document.createElement('input'));
        radioAuto.setAttribute('type', 'radio');
        radioAuto.setAttribute('name', 'mode');
        radioAuto.setAttribute('value', 'auto');
        radioAuto.setAttribute('id', 'bcsde_mode_auto');
        radioAuto.checked = darkModeValue.startsWith('3');
        radioAuto.addEventListener('change', onChange);
        const labelAuto = container.appendChild(document.createElement('label'));
        labelAuto.setAttribute('for', 'bcsde_mode_auto');
        labelAuto.appendChild(document.createTextNode('Auto (sunset till sunrise)'));
        const preAutoStatus = container.appendChild(document.createElement('pre'));
        preAutoStatus.setAttribute('id', 'bcsde_mode_auto_status');
        preAutoStatus.setAttribute('style', 'font-family:monospace');
        return 'Dark theme details';
      }
    },
    discographyplayerSidebar: {
      true: function checkScreenSize(container) {
        if (!window.matchMedia('(min-width: 1600px)').matches) {
          const span = container.appendChild(document.createElement('span'));
          span.appendChild(document.createTextNode('Your screen/browser window is not wide enough for this option. Width of at least 1600px required'));
          container.style.opacity = 1;
        } else {
          container.style.opacity = 0;
        }
        return fullfill();
      },
      false: function removeContainerAboutScreenSize(container) {
        container.style.opacity = 0;
        return fullfill();
      }
    },
    nextSongNotifications: {
      true: async function populateNotificationSettings(container) {
        const onChange = async function () {
          const input = this;
          document.getElementById('bcsde_notification_timeout').classList.remove('errorblink');
          let seconds = -1;
          try {
            seconds = parseFloat(document.getElementById('bcsde_notification_timeout').value.trim());
          } catch (e) {
            seconds = -1;
          }
          if (seconds < 0) {
            document.getElementById('bcsde_notification_timeout').classList.add('errorblink');
          } else {
            NOTIFICATION_TIMEOUT = parseInt(1000.0 * seconds);
            await GM.setValue('notification_timeout', NOTIFICATION_TIMEOUT);
            input.style.boxShadow = '2px 2px 5px #0a0f';
            window.setTimeout(function resetBoxShadowTimeout() {
              input.style.boxShadow = '';
            }, 3000);
          }
        };
        const labelTimeout = container.appendChild(document.createElement('label'));
        labelTimeout.setAttribute('for', 'bcsde_notification_timeout');
        labelTimeout.appendChild(document.createTextNode('Show for '));
        const inputTimeout = container.appendChild(document.createElement('input'));
        inputTimeout.setAttribute('type', 'text');
        inputTimeout.setAttribute('size', '3');
        inputTimeout.setAttribute('value', (await GM.getValue('notification_timeout', NOTIFICATION_TIMEOUT)) / 1000.0);
        inputTimeout.setAttribute('id', 'bcsde_notification_timeout');
        inputTimeout.addEventListener('change', onChange);
        const labelPostTimeout = container.appendChild(document.createElement('label'));
        labelPostTimeout.setAttribute('for', 'bcsde_notification_timeout');
        labelPostTimeout.appendChild(document.createTextNode(' seconds (0 = show until manually closed or default value of browser)'));
      }
    },
    customReleaseDateFormat: {
      true: async function populateCustomReleaseDateFormatSettings(container) {
        const defaultFormat = '%YYYY%.%MM%.%DD%';
        const onChange = async function () {
          const input = this;
          document.getElementById('bcsde_custom_release_date_format_str').classList.remove('errorblink');
          let format = defaultFormat;
          const customFormat = document.getElementById('bcsde_custom_release_date_format_str').value;
          if (customFormat && customFormat.trim()) {
            format = customFormat.trim();
            await GM.setValue('custom_release_date_format_str', format);
            input.style.boxShadow = '2px 2px 5px #0a0f';
            window.setTimeout(function resetBoxShadowTimeout() {
              input.style.boxShadow = '';
            }, 3000);
          } else {
            document.getElementById('bcsde_custom_release_date_format_str').classList.add('errorblink');
          }
        };
        const onKeyUp = function () {
          let format = '';
          const customFormat = document.getElementById('bcsde_custom_release_date_format_str').value;
          const preview = document.getElementById('bcsde_custom_release_date_preview');
          if (customFormat && customFormat.trim()) {
            format = customFormat.trim();
            preview.textContent = 'Preview: ' + customDateFormatter(format, new Date(981154800000));
          } else {
            preview.textContent = 'Preview:';
          }
        };
        const labelFormat = container.appendChild(document.createElement('label'));
        labelFormat.setAttribute('for', 'bcsde_custom_release_date_format_str');
        labelFormat.appendChild(document.createTextNode('Custom format: '));
        const inputFormat = container.appendChild(document.createElement('input'));
        inputFormat.setAttribute('type', 'text');
        inputFormat.setAttribute('size', '40');
        inputFormat.setAttribute('value', await GM.getValue('custom_release_date_format_str', defaultFormat));
        inputFormat.setAttribute('id', 'bcsde_custom_release_date_format_str');
        inputFormat.addEventListener('change', onChange);
        inputFormat.addEventListener('change', onKeyUp);
        inputFormat.addEventListener('keyup', onKeyUp);
        container.appendChild(document.createElement('br'));
        const preview = container.appendChild(document.createElement('span'));
        preview.setAttribute('id', 'bcsde_custom_release_date_preview');
        preview.readOnly = true;
        container.appendChild(document.createElement('br'));
        const link = container.appendChild(document.createElement('a'));
        link.setAttribute('target', '_blank');
        link.setAttribute('href', 'https://github.com/cvzi/Bandcamp-script-deluxe-edition/issues/284#issuecomment-1563394077');
        link.appendChild(document.createTextNode('Format options: %DD%, %MM%, %YYYY%, ...'));
        onKeyUp();
      }
    }
  };
  let player, audio, currentDuration, timeline, playhead, bufferbar;
  let onPlayHead = false;
  const spriteRepeatShuffle = "url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACUAAABgCAMAAACt1UvuAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAAA2UExURQAAAP////39/Tw8PP///////w4ODv////7+/v7+/k5OTktLS35+fiAgIJSUlAAAABAQECoqKpxAnVsAAAAPdFJOUwAxQ05UJGkKBRchgWiOOufd5UcAAAKrSURBVEjH7ZfrkqQgDIUbFLmphPd/2T2EgNqNzlTt7o+p3dR0d5V+JOGEYzkvZ63nsNY6517XCPIrjIDvXF7qL24ao5QynesIllDKE1MpJdom1UDBQIQlE+HmEipVIk+6cqVqQYivlq/loBJFDa6WnaitbbnMtFHnOF1niDJJX14pPa+cOm0l3Vohyuus8xpkj9ih1nPke6iaO6KV323XqwhRON4tQ3GedakNYYQqslaO+yv9xs64Lh2rX8sWeSISzVWTk8ROJmmU9MTl1PvEnHBmzXRSzvhhuqJAzjlJY9eJCVWljKwcESbL+fbTYK0NWx0IGodyvKCACqp6VqMNlguhktbxMqHdI5k7ps1SsiTxPO0YDgojkZPIysl+617cy8rUkIfPflMY4IaKLZfHhSoPn782iQJC5tIX2nfNQseGG4eoe3T1+kXh7j1j/H6W9TbC65ZxR2S0frKePUWYlhbY/hTkvL6aiKPApCRTeoxNTvUTI16r1DqPAqrGVR0UT/ojwGByJ6qO8S32HQ6wJ8r4TwFdyGnx7kzVM8l/nZpwRwkm1GAKC+5oKflMzY3aUm4rBpSsd17pVv2Bsn739ivqFWK2bhD2TE0wwTKM3Knu2puo1PJ8blqu7TEXVY1wgvGQwYN6HKJR0WGjYqxheN/lCpOzd/GlHX+gHyEe/SE/qpyV+sKPfqdEhzVv/OjwwC3zlefnnR+9YW+5Zz86fzjw3o+f1NCP9oMa+fGeOvnR2brH/378B/xI9A0/UjUjSfyOH2GzCDOuKavyUUM/eryMFjNOIMrHD/1o4di0GlCkp8IP/RjwglRSCKX9yI845VGXqwc18KOtWq3mSr35EQVnHbnzC3X144I3d7Wj6xuq+hH7gwz4PvY48GP9p8i2Vzus/dt+pB/nx18MUmsLM2EHrwAAAABJRU5ErkJggg==')";
  function humanDuration(duration) {
    let hours = parseInt(duration / 3600);
    if (!hours) {
      hours = '';
    } else {
      hours += ':';
    }
    duration %= 3600;
    let minutes = parseInt(duration / 60);
    minutes = (minutes < 10 ? '0' : '') + minutes;
    duration %= 60;
    let seconds = parseInt(duration);
    if (duration - seconds >= 0.5) {
      seconds++;
    }
    seconds = (seconds < 10 ? '0' : '') + seconds;
    return `${hours}${minutes}:${seconds}`;
  }
  function humanBytes(bytes, precision) {
    bytes = parseInt(bytes, 10);
    if (bytes === 0) {
      return '0 Byte';
    }
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toPrecision(2)) + ' ' + sizes[i];
  }
  function addLogVolume(mediaElement) {
    if (!Object.hasOwnProperty.call(mediaElement, 'logVolume')) {
      Object.defineProperty(mediaElement, 'logVolume', {
        get() {
          return Math.log((Math.E - 1) * this.volume + 1);
        },
        set(percentage) {
          this.volume = (Math.exp(percentage) - 1) / (Math.E - 1);
        }
      });
    }
  }
  function randomIndex(max) {
    // Random int from interval [0,max)
    return Math.floor(Math.random() * Math.floor(max));
  }
  function padd(n, width, filler) {
    let s;
    for (s = n.toString(); s.length < width; s = filler + s);
    return s;
  }
  function metricPrefix(n, decimals, k) {
    // From http://stackoverflow.com/a/18650828
    if (n <= 0) {
      return String(n);
    }
    k = k || 1000;
    const dm = decimals <= 0 ? 0 : decimals || 2;
    const sizes = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return parseFloat((n / Math.pow(k, i)).toFixed(dm)) + sizes[i];
  }
  function fixFilename(s) {
    const forbidden = '*"/\\[]:|,<>?\n\t\0'.split('');
    forbidden.forEach(function (char) {
      s = s.replace(char, '');
    });
    return s;
  }
  function fullfill(x) {
    return new Promise(resolve => resolve(x));
  }
  function customDateFormatter(format, date) {
    const fields = {
      '%isoDate%': () => date.toISOString(),
      '%unix%': () => parseInt(date.getTime() / 1000),
      '%YY%': () => date.getFullYear().toString().substring(2),
      '%YYYY%': () => date.getFullYear(),
      '%M%': () => date.getMonth() + 1,
      '%MM%': () => padd(date.getMonth() + 1, 2, '0'),
      '%Mon%': () => date.toLocaleString(undefined, {
        month: 'short'
      }),
      '%Month%': () => date.toLocaleString(undefined, {
        month: 'long'
      }),
      '%D%': () => date.getDate(),
      '%DD%': () => padd(date.getDate(), 2, '0'),
      '%Da%': () => date.toLocaleString(undefined, {
        weekday: 'short'
      }),
      '%Day%': () => date.toLocaleString(undefined, {
        weekday: 'long'
      }),
      '%Dord%': () => date.getDate() + (date.getDate() % 10 === 1 && date.getDate() !== 11 ? 'st' : date.getDate() % 10 === 2 && date.getDate() !== 12 ? 'nd' : date.getDate() % 10 === 3 && date.getDate() !== 13 ? 'rd' : 'th'),
      '%json%': () => date.toJSON()
    };
    for (const field in fields) {
      if (format.includes(field)) {
        try {
          format = format.replace(field, fields[field]());
        } catch (e) {
          console.log('customDateFormatter: Could not format replace "' + field + '": ' + e);
        }
      }
    }
    return format;
  }
  const stylesToInsert = [];
  function addStyle(css) {
    if (GM_addStyle && css) {
      return GM_addStyle(css);
    } else {
      if (css) {
        stylesToInsert.push(css);
      }
      const head = document.head ? document.head : document.documentElement;
      if (head) {
        let style = document.createElement('style');
        if (style) {
          while (stylesToInsert.length) {
            head.append(style);
            style.type = 'text/css';
            style.appendChild(document.createTextNode(stylesToInsert.shift()));
            style = document.createElement('style');
          }
          return fullfill(style);
        }
      }
      // document was not ready, wait
      return new Promise(resolve => window.setTimeout(() => addStyle(false).then(resolve), 100));
    }
  }
  function css2rgb(colorStr) {
    const div = document.body.appendChild(document.createElement('div'));
    div.style.color = colorStr;
    const m = window.getComputedStyle(div).color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
    div.remove();
    if (m) {
      m.shift();
      return m;
    }
    return null;
  }
  function base64encode(s) {
    // from https://gist.github.com/stubbetje/229984
    const base64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split('');
    const l = s.length;
    let o = '';
    for (let i = 0; i < l; i++) {
      const byte0 = s.charCodeAt(i++) & 0xff;
      const byte1 = s.charCodeAt(i++) & 0xff;
      const byte2 = s.charCodeAt(i) & 0xff;
      o += base64[byte0 >> 2];
      o += base64[(byte0 & 0x3) << 4 | byte1 >> 4];
      const t = i - l;
      if (t >= 0) {
        if (t === 0) {
          o += base64[(byte1 & 0x0f) << 2 | byte2 >> 6];
          o += base64[64];
        } else {
          o += base64[64];
          o += base64[64];
        }
      } else {
        o += base64[(byte1 & 0x0f) << 2 | byte2 >> 6];
        o += base64[byte2 & 0x3f];
      }
    }
    return o;
  }
  function decodeHTMLentities(input) {
    return new window.DOMParser().parseFromString(input, 'text/html').documentElement.textContent;
  }
  function timeSince(date) {
    // https://stackoverflow.com/a/72973090/
    const MINUTE = 60;
    const HOUR = MINUTE * 60;
    const DAY = HOUR * 24;
    const WEEK = DAY * 7;
    const MONTH = DAY * 30;
    const YEAR = DAY * 365;
    const secondsAgo = Math.round((Date.now() - Number(date)) / 1000);
    if (secondsAgo < MINUTE) {
      return secondsAgo + ` second${secondsAgo !== 1 ? 's' : ''} ago`;
    }
    let divisor;
    let unit = '';
    if (secondsAgo < HOUR) {
      [divisor, unit] = [MINUTE, 'minute'];
    } else if (secondsAgo < DAY) {
      [divisor, unit] = [HOUR, 'hour'];
    } else if (secondsAgo < WEEK) {
      [divisor, unit] = [DAY, 'day'];
    } else if (secondsAgo < MONTH) {
      [divisor, unit] = [WEEK, 'week'];
    } else if (secondsAgo < YEAR) {
      [divisor, unit] = [MONTH, 'month'];
    } else {
      [divisor, unit] = [YEAR, 'year'];
    }
    const count = Math.floor(secondsAgo / divisor);
    return `${count} ${unit}${count > 1 ? 's' : ''} ago`;
  }
  function nowInTimeRange(range) {
    // Format: range = 'hh:mm->hh:mm'
    const m = range.match(/(\d{1,2}):(\d{1,2})->(\d{1,2}):(\d{1,2})/);
    const [fromHours, fromMinutes, toHours, toMinutes] = [parseInt(m[1]), parseInt(m[2]), parseInt(m[3]), parseInt(m[4])];
    const now = new Date();
    const from = new Date();
    from.setHours(fromHours);
    from.setMinutes(fromMinutes);
    const to = new Date();
    to.setHours(toHours);
    to.setMinutes(toMinutes);
    if (to - from < 0) {
      to.setDate(to.getDate() + 1);
    }
    return now > from && now < to;
  }
  function nowInBetween(from, to) {
    const time = new Date();
    const start = from.getHours() * 60 + from.getMinutes();
    const end = to.getHours() * 60 + to.getMinutes();
    const now = time.getHours() * 60 + time.getMinutes();
    if (start >= end) {
      return start <= now && now >= end || start >= now && now <= end;
    } else {
      return start <= now && now <= end;
    }
  }
  function loadCrossSiteImage(url) {
    return new Promise(function downloadCrossSiteImage(resolve, reject) {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img0 = document.createElement('img'); // Load the image in a <img> to get the dimensions
      img0.addEventListener('load', function onImgLoad() {
        if (img0.height === 0 || img0.width === 0) {
          reject(new Error('loadCrossSiteImage("$url") Error: Could not load image in <img>'));
          return;
        }
        canvas.height = img0.height;
        canvas.width = img0.width;
        // Download image data
        GM.xmlHttpRequest({
          method: 'GET',
          overrideMimeType: 'text/plain; charset=x-user-defined',
          url,
          onload: function (resp) {
            // Create a data url image
            const dataurl = 'data:image/jpeg;base64,' + base64encode(resp.responseText);
            const img1 = document.createElement('img');
            img1.addEventListener('load', function () {
              // Load data url image into canvas
              ctx.drawImage(img1, 0, 0);
              resolve(canvas);
            });
            img1.src = dataurl;
          },
          onerror: function (response) {
            console.log('loadCrossSiteImage("' + url + '") Error: ' + response.status + '\n' + ('error' in response ? response.error : ''));
            reject(new Error('error' in response ? response.error : 'loadCrossSiteImage failed'));
          }
        });
      });
      img0.src = url;
    });
  }
  function removeViaQuerySelector(parent, selector) {
    if (typeof selector === 'undefined') {
      selector = parent;
      parent = document;
    }
    for (let el = parent.querySelector(selector); el; el = parent.querySelector(selector)) {
      el.remove();
    }
  }
  function firstChildWithText(parent) {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i];
      if (node.nodeType === window.Node.TEXT_NODE && node.nodeValue.trim()) {
        return node;
      } else if (node.childNodes.length) {
        const r = firstChildWithText(node);
        if (r) {
          return r;
        }
      }
    }
    return false;
  }
  function parentQuery(node, q) {
    const parents = [node.parentElement];
    node = node.parentElement.parentElement;
    while (node) {
      const lst = node.querySelectorAll(q);
      for (let i = 0; i < lst.length; i++) {
        if (parents.indexOf(lst[i]) !== -1) {
          return lst[i];
        }
      }
      parents.push(node);
      node = node.parentElement;
    }
    return null;
  }
  function suntimes(date, lat, lng) {
    // According to "Predicting Sunrise and Sunset Times" by Donald A. Teets:
    // https://www.maa.org/sites/default/files/teets09010341463.pdf
    lat = lat * Math.PI / 180.0;
    const dayOfYear = Math.round((date - new Date(date).setMonth(0, 0)) / 86400000);
    const sunDist = 149598000.0;
    const radius = 6378.0;
    const epsilon = 0.409;
    const thetha = 2 * Math.PI / 365.25 * (dayOfYear - 80);
    const n = 720 - 10 * Math.sin(2 * thetha) + 8 * Math.sin(2 * Math.PI / 365.25 * dayOfYear);
    const z = sunDist * Math.sin(thetha) * Math.sin(epsilon);
    const rp = Math.sqrt(sunDist * sunDist - z * z);
    const t0 = 1440 / (2 * Math.PI) * Math.acos((radius - z * Math.sin(lat)) / (rp * Math.cos(lat)));
    const sunriseMin = n - t0 - 5 - 4.0 * lng % 15.0 - date.getTimezoneOffset();
    const sunsetMin = sunriseMin + 2 * t0;
    const sunrise = new Date(date);
    sunrise.setHours(sunriseMin / 60, Math.round(sunriseMin % 60));
    const sunset = new Date(date);
    sunset.setHours(sunsetMin / 60, Math.round(sunsetMin % 60));
    return {
      sunrise,
      sunset
    };
  }
  function fromISO6709(s) {
    // Format: s = '+-DDMM+-DDDMM'
    // Format: s = '+-DDMMSS+-DDDMMSS'
    function convert(iso, negative) {
      const mm = iso % 100;
      const dd = iso / 100;
      return (dd + mm / 60) * (negative ? -1 : 1);
    }
    const m = s.match(/([+-])(\d+)([+-])(\d+)/);
    const lat = convert(parseInt(m[2]), m[1] === '-');
    const lng = convert(parseInt(m[4]), m[3] === '-');
    return {
      latitude: lat,
      longitude: lng
    };
  }
  function getGPSLocation() {
    return new Promise(function downloadCrossSiteImage(resolve, reject) {
      navigator.geolocation.getCurrentPosition(function onSuccess(position) {
        resolve({
          source: `navigator.geolocation@${new Date(position.timestamp).toLocaleString()}`,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      }, function onError(err) {
        console.log('getGPSLocation Error:');
        console.log(err);
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('getGPSLocation: Timezone: ' + tz);
        GM.xmlHttpRequest({
          method: 'GET',
          url: 'https://raw.githubusercontent.com/iospirit/NSTimeZone-ISCLLocation/master/zone.tab',
          onload: function (response) {
            if (response.responseText.indexOf(tz) !== -1) {
              const line = response.responseText.split(tz)[0].split('\n').pop();
              const myPosition = fromISO6709(line);
              myPosition.source = 'Browser timezone ' + tz;
              resolve(myPosition);
            } else if (response.status !== 200) {
              reject(new Error('Could not download time zone locations: http status=' + response.status));
            } else {
              reject(new Error('Unkown time zone location: ' + tz));
            }
          },
          onerror: function (response) {
            reject(new Error('Could not download time zone locations: ' + response.error));
          }
        });
      });
    });
  }
  const _dateOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  const _dateOptionsWithoutYear = {
    month: 'short',
    day: 'numeric'
  };
  const _dateOptionsNumericWithoutYear = {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit'
  };
  function dateFormater(date) {
    if (date.getFullYear() === new Date().getFullYear()) {
      return date.toLocaleDateString(undefined, _dateOptionsWithoutYear);
    } else {
      return date.toLocaleDateString(undefined, _dateOptions);
    }
  }
  function dateFormaterRelease(date) {
    return date.toLocaleDateString(undefined, _dateOptionsWithoutYear) + ', ' + date.getFullYear();
  }
  function dateFormaterNumeric(date) {
    return date.toLocaleDateString(undefined, _dateOptionsNumericWithoutYear);
  }
  let enabledFeaturesLoaded = false;
  function getEnabledFeatures(enabledFeaturesValue) {
    for (const feature in allFeatures) {
      allFeatures[feature].enabled = allFeatures[feature].default;
    }
    if (enabledFeaturesValue !== false) {
      const enabledFeatures = JSON.parse(enabledFeaturesValue);
      if (enabledFeatures.constructor === Object) {
        for (const feature in enabledFeatures) {
          if (feature in allFeatures) {
            allFeatures[feature].enabled = enabledFeatures[feature].enabled;
          }
        }
      }
    }
    enabledFeaturesLoaded = true;
    return allFeatures;
  }
  function findUserProfileUrl() {
    if (document.querySelector('#collection-main a')) {
      return document.querySelector('#collection-main a').href;
    }
    return 'https://bandcamp.com/login';
  }
  let ivRestoreVolume;
  function getStoredVolume(callbackIfVolumeExists) {
    GM.getValue('volume', '0.7').then(str => {
      return parseFloat(str);
    }).then(function storedVolumeLoaded(volume) {
      if (!Number.isNaN(volume) && volume > 0.0) {
        callbackIfVolumeExists(volume);
      }
    });
  }
  function restoreVolume() {
    getStoredVolume(function getStoredVolumeCallback(volume) {
      const restoreVolumeInterval = function restoreInterval() {
        const audios = document.querySelectorAll('audio,video');
        if (audios.length > 0) {
          let paused = true;
          audios.forEach(function (media) {
            addLogVolume(media);
            paused = paused && media.paused;
            media.logVolume = volume;
          });
          if (!paused) {
            // Clear interval once audio is actually playing
            window.clearInterval(ivRestoreVolume);
          }
          // Update volume bar on tag player (by double clicking mute button)
          const muteWrapper = document.querySelector('.vol-icon-wrapper');
          if (muteWrapper) {
            const mouseDownEvent = new MouseEvent('mousedown', {
              view: unsafeWindow,
              bubbles: true,
              cancelable: true
            });
            muteWrapper.dispatchEvent(mouseDownEvent);
            muteWrapper.dispatchEvent(mouseDownEvent);
          }
        }
      };
      restoreVolumeInterval();
      ivRestoreVolume = window.setInterval(restoreVolumeInterval, 500);
    });
    window.setTimeout(function clearRestoreInterval() {
      window.clearInterval(ivRestoreVolume);
    }, 7000);
  }
  function findPreviousAlbumCover(currentUrl) {
    const currentKey = albumKey(currentUrl);
    const as = document.querySelectorAll('.music-grid .music-grid-item a[href*="/album/"],.music-grid .music-grid-item a[href*="/track/"]');
    let last = false;
    let found = false;
    for (let i = 0; i < as.length; i++) {
      if (last && albumKey(as[i].href) === currentKey) {
        found = last;
        break;
      }
      last = as[i];
    }
    if (found) {
      return playAlbumFromCover.apply(found, null);
    }
    return false;
  }
  function findNextAlbumCover(currentUrl) {
    const currentKey = albumKey(currentUrl);
    const as = document.querySelectorAll('.music-grid .music-grid-item a[href*="/album/"],.music-grid .music-grid-item a[href*="/track/"]');
    let isNext = false;
    for (let i = 0; i < as.length; i++) {
      if (isNext) {
        playAlbumFromCover.apply(as[i], null);
        return true;
      }
      if (albumKey(as[i].href) === currentKey) {
        isNext = true;
      }
    }
    return false;
  }
  const shufflePlayed = [];
  function musicPlayerNextSong(next) {
    const current = player.querySelector('.playlist .playing');
    if (!next) {
      if (player.querySelector('.shufflebutton').classList.contains('active')) {
        // Shuffle mode
        const allLoadedSongs = document.querySelectorAll('.playlist .playlistentry');
        // Set a random song (that is not the current song and not in shufflePlayed)
        let index = null;
        for (let i = 0; i < 10; i++) {
          index = randomIndex(allLoadedSongs.length);
          const file = allLoadedSongs[index].dataset.file;
          if (file !== current.dataset.file && shufflePlayed.indexOf(file) !== -1) {
            break;
          }
        }
        next = allLoadedSongs[index];
        shufflePlayed.push(next.dataset.file);
      } else {
        // Normal mode
        next = current.nextElementSibling;
        while (next) {
          if ('file' in next.dataset) {
            break;
          }
          next = next.nextElementSibling;
        }
      }
    }
    if (next) {
      current.classList.remove('playing');
      next.classList.add('playing');
      musicPlayerPlaySong(next);
    } else {
      // End of playlist reached
      if (findNextAlbumCover(current.dataset.albumUrl) === false) {
        const notloaded = player.querySelector('.playlist .playlistheading a.notloaded');
        if (notloaded) {
          // Unloaded albums in playlist
          const url = notloaded.href;
          notloaded.remove();
          cachedTralbumData(url).then(function onCachedTralbumDataLoaded(TralbumData) {
            if (TralbumData) {
              addAlbumToPlaylist(TralbumData);
            } else {
              playAlbumFromUrl(url);
            }
          });
        } else {
          audio.pause();
          audio.currentTime -= 1;
          musicPlayerOnTimeUpdate();
          window.alert('End of playlist reached');
        }
      }
    }
  }
  let ivSlideInNextSong;
  function musicPlayerPlaySong(next, startTime) {
    currentDuration = next.dataset.duration;
    player.querySelector('.durationDisplay .current').innerHTML = '-';
    player.querySelector('.durationDisplay .total').innerHTML = humanDuration(currentDuration);
    audio.src = next.dataset.file;
    if (typeof startTime !== 'undefined' && startTime !== false) {
      audio.currentTime = startTime;
    }
    bufferbar.classList.remove('bufferbaranimation');
    window.setTimeout(function bufferbaranimationWidth() {
      bufferbar.style.width = '0px';
      window.setTimeout(function bufferbaranimationClass() {
        bufferbar.classList.add('bufferbaranimation');
      }, 10);
    }, 0);
    const key = albumKey(next.dataset.albumUrl);

    // Meta
    const currentlyPlaying = document.querySelector('.currentlyPlaying');
    const nextInRow = player.querySelector('.nextInRow');
    nextInRow.querySelector('.cover').href = next.dataset.albumUrl;
    nextInRow.querySelector('.cover img').src = next.dataset.albumCover;
    nextInRow.querySelector('.info .link').href = next.dataset.albumUrl;
    nextInRow.querySelector('.info .title').innerHTML = next.dataset.title;
    nextInRow.querySelector('.info .artist').innerHTML = next.dataset.artist;
    nextInRow.querySelector('.info .album').innerHTML = next.dataset.album;

    // Favicon
    musicPlayerFavicon(next.dataset.albumCover.replace(/_\d.jpg$/, '_3.jpg'));

    // Wishlist
    const collectWishlist = player.querySelector('.collect-wishlist');
    collectWishlist.dataset.albumUrl = next.dataset.albumUrl;
    player.querySelectorAll('.collect-wishlist>*').forEach(function (e) {
      e.style.display = 'none';
    });
    if (next.dataset.isPurchased === 'true') {
      player.querySelector('.collect-wishlist .wishlist-own').style.display = 'inline-block';
      collectWishlist.dataset.wishlist = 'own';
    } else if (next.dataset.inWishlist === 'true') {
      player.querySelector('.collect-wishlist .wishlist-collected').style.display = 'inline-block';
      collectWishlist.dataset.wishlist = 'collected';
    } else {
      // Always show whishlist button for whole album
      player.querySelector('.collect-wishlist .wishlist-add').style.display = 'inline-block';
      player.querySelector('.collect-wishlist .wishlist-add .album').style.display = 'inline';
      collectWishlist.dataset.wishlist = 'add';
      if (next.dataset.isDownloadable === 'true' && next.dataset.trackUrl) {
        // Only show wishlist button for single track if the track is downloadable and there is a track url
        collectWishlist.dataset.trackUrl = next.dataset.trackUrl;
        player.querySelector('.collect-wishlist .wishlist-add .track').style.display = 'inline';
        player.querySelector('.collect-wishlist .wishlist-add .slash').style.display = 'inline';
      } else {
        player.querySelector('.collect-wishlist .wishlist-add .track').style.display = 'none';
        player.querySelector('.collect-wishlist .wishlist-add .slash').style.display = 'none';
      }
    }

    // Played/Listened
    const collectListened = player.querySelector('.collect-listened');
    if (allFeatures.markasplayed.enabled && collectListened) {
      collectListened.dataset.albumUrl = next.dataset.albumUrl;
      player.querySelectorAll('.collect-listened>*').forEach(function (e) {
        e.style.display = 'none';
      });
      GM.getValue('myalbums', '{}').then(function myalbumsLoaded(str) {
        const myalbums = JSON.parse(str);
        if (key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened) {
          player.querySelector('.collect-listened .listened').style.display = 'inline-block';
          const date = new Date(myalbums[key].listened);
          const since = timeSince(date);
          player.querySelector('.collect-listened .listened').title = since + ' ago\nClick to mark as NOT played';
          collectListened.dataset.listened = myalbums[key].listened;
        } else {
          player.querySelector('.collect-listened .mark-listened').style.display = 'inline-block';
          collectListened.dataset.listened = false;
        }
      });
    } else if (collectListened) {
      collectListened.remove();
    }

    // Notification
    if (allFeatures.nextSongNotifications.enabled && 'notification' in GM) {
      GM.notification({
        title: document.location.host,
        text: next.dataset.title + '\nby ' + next.dataset.artist + '\nfrom ' + next.dataset.album,
        image: next.dataset.albumCover,
        highlight: false,
        silent: true,
        timeout: NOTIFICATION_TIMEOUT,
        onclick: musicPlayerNext
      });
    }

    // Media hub
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: next.dataset.title,
        artist: next.dataset.artist,
        album: next.dataset.album,
        artwork: [{
          src: next.dataset.albumCover,
          sizes: '350x350',
          type: 'image/jpeg'
        }]
      });
      navigator.mediaSession.setActionHandler('previoustrack', musicPlayerPrev);
      navigator.mediaSession.setActionHandler('nexttrack', musicPlayerNext);
      navigator.mediaSession.setActionHandler('play', _ => audio.play());
      navigator.mediaSession.setActionHandler('pause', _ => audio.pause());
      navigator.mediaSession.setActionHandler('seekbackward', function (event) {
        const skipTime = event.seekOffset || DEFAULTSKIPTIME;
        audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
        musicPlayerUpdatePositionState();
      });
      navigator.mediaSession.setActionHandler('seekforward', function (event) {
        const skipTime = event.seekOffset || DEFAULTSKIPTIME;
        audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration || currentDuration);
        musicPlayerUpdatePositionState();
      });
      try {
        navigator.mediaSession.setActionHandler('stop', _ => musicPlayerClose());
      } catch (error) {
        console.log('Warning! The "stop" media session action is not supported.');
      }
      try {
        navigator.mediaSession.setActionHandler('seekto', function (event) {
          if (event.fastSeek && 'fastSeek' in audio) {
            audio.fastSeek(event.seekTime);
            return;
          }
          audio.currentTime = event.seekTime;
          musicPlayerUpdatePositionState();
        });
      } catch (error) {
        console.log('Warning! The "seekto" media session action is not supported.');
      }
    }

    // Download link
    const downloadLink = player.querySelector('.downloadlink');
    if (allFeatures.discographyplayerDownloadLink.enabled) {
      downloadLink.href = next.dataset.file;
      downloadLink.download = (next.dataset.trackNumber > 9 ? '' : '0') + next.dataset.trackNumber + '. ' + fixFilename(next.dataset.artist + ' - ' + next.dataset.title) + '.mp3';
      downloadLink.style.display = 'block';
    } else {
      downloadLink.style.display = 'none';
    }

    // Show "playing" indication on album covers
    let coverLinkPattern = albumPath(next.dataset.albumUrl);
    if (document.location.href.split('.')[0] !== next.dataset.albumUrl.split('.')[0]) {
      /*
      Subdomain is different from album subdomain -> multiple artists on this page, use full url to detect albums.
      Otherwise albums with the same name but a different artist name will be highlighted.
      This would happen quite often on search results.
      */
      coverLinkPattern = albumKey(next.dataset.albumUrl);
    }
    document.querySelectorAll('img.albumIsCurrentlyPlaying').forEach(img => img.classList.remove('albumIsCurrentlyPlaying'));
    document.querySelectorAll('.albumIsCurrentlyPlayingIndicator').forEach(div => div.remove());
    document.querySelectorAll('a[href*="' + coverLinkPattern + '"] img,.info>a[href*="' + coverLinkPattern + '"]').forEach(function (img) {
      let node = img;
      while (node) {
        if (node.id === 'discographyplayer') {
          return;
        }
        if (node === document.body) {
          break;
        }
        node = node.parentNode;
      }
      if (img.tagName === 'A') {
        img = img.parentNode.parentNode.querySelector('.art img');
      }
      img.classList.add('albumIsCurrentlyPlaying');
      if (!img.parentNode.querySelector('.albumIsCurrentlyPlayingIndicator')) {
        const indicator = img.parentNode.appendChild(document.createElement('div'));
        indicator.classList.add('albumIsCurrentlyPlayingIndicator');
        indicator.addEventListener('click', function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          if (!musicPlayerPlay()) {
            // Album is now paused -> Remove indicators
            document.querySelectorAll('img.albumIsCurrentlyPlaying').forEach(img => img.classList.remove('albumIsCurrentlyPlaying'));
            document.querySelectorAll('.albumIsCurrentlyPlayingIndicator').forEach(div => div.remove());
          }
        });
        indicator.appendChild(document.createElement('div')).classList.add('currentlyPlayingBg');
        indicator.appendChild(document.createElement('div')).classList.add('currentlyPlayingIcon');
      }
    });

    // Animate
    if (allFeatures.discographyplayerSidebar.enabled && window.matchMedia('(min-width: 1600px)').matches) {
      // Slide up
      currentlyPlaying.style.marginTop = -parseInt(currentlyPlaying.clientHeight + 1) + 'px';
      nextInRow.style.height = '99%';
      nextInRow.style.width = '99%';
      window.clearTimeout(ivSlideInNextSong);
      ivSlideInNextSong = window.setTimeout(function slideInSongInterval() {
        currentlyPlaying.remove();
        const clone = nextInRow.cloneNode(true);
        clone.style.height = '0%';
        clone.className = 'nextInRow';
        nextInRow.className = 'currentlyPlaying';
        nextInRow.parentNode.appendChild(clone);
      }, 600);
    } else {
      // Slide to the left
      currentlyPlaying.style.marginLeft = -parseInt(currentlyPlaying.clientWidth + 1) + 'px';
      nextInRow.style.height = '99%';
      nextInRow.style.width = '99%';
      window.clearTimeout(ivSlideInNextSong);
      ivSlideInNextSong = window.setTimeout(function slideInSongInterval() {
        currentlyPlaying.remove();
        const clone = nextInRow.cloneNode(true);
        clone.style.width = '0%';
        clone.className = 'nextInRow';
        nextInRow.className = 'currentlyPlaying';
        nextInRow.parentNode.appendChild(clone);
      }, 7 * 1000);
    }
    window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({
      block: 'nearest'
    }), 200);
  }
  function musicPlayerPlay() {
    if (audio.paused) {
      audio.play().then(_ => musicPlayerUpdatePositionState());
      musicPlayerCookieChannelSendStop();
      return true;
    } else {
      audio.pause();
      document.querySelectorAll('img.albumIsCurrentlyPlaying').forEach(img => img.classList.remove('albumIsCurrentlyPlaying'));
      document.querySelectorAll('.albumIsCurrentlyPlayingIndicator').forEach(div => div.remove());
      return false;
    }
  }
  function musicPlayerStop() {
    if (!audio.paused) {
      audio.pause();
    }
  }
  function musicPlayerPrev() {
    musicPlayerShowBusy();
    const current = player.querySelector('.playlist .playing');
    let prev = current.previousElementSibling;
    while (prev) {
      if ('file' in prev.dataset) {
        break;
      }
      prev = prev.previousElementSibling;
    }
    if (prev) {
      musicPlayerNextSong(prev);
    }
  }
  function musicPlayerNext() {
    musicPlayerShowBusy();
    musicPlayerNextSong();
  }
  function musicPlayerPrevAlbum() {
    audio.pause();
    window.setTimeout(function musicPlayerPrevAlbumTimeout() {
      musicPlayerShowBusy();
      const url = player.querySelector('.playlist .playing').dataset.albumUrl;
      if (!findPreviousAlbumCover(url)) {
        // Find previous album in playlist
        let prev = false;
        const as = player.querySelectorAll('.playlist .playlistheading a');
        for (let i = 0; i < as.length; i++) {
          if (albumKey(as[i].href) === albumKey(url)) {
            if (i > 0) {
              prev = as[i - 1];
            }
            break;
          }
        }
        if (prev) {
          prev.parentNode.click();
        } else {
          // Just play first song in playlist
          player.querySelector('.playlist .playlistentry').click();
        }
      }
    }, 10);
  }
  function musicPlayerNextAlbum() {
    audio.pause();
    window.setTimeout(function musicPlayerNextAlbumTimeout() {
      musicPlayerShowBusy();
      const r = findNextAlbumCover(player.querySelector('.playlist .playing').dataset.albumUrl);
      if (r === false) {
        // Find next album in playlist
        let reachedPlaying = false;
        let found = false;
        const lis = player.querySelectorAll('.playlist li');
        for (let i = 0; i < lis.length; i++) {
          if (reachedPlaying && lis[i].classList.contains('playlistheading')) {
            lis[i].click();
            found = true;
            break;
          } else if (lis[i].classList.contains('playing')) {
            reachedPlaying = true;
          }
        }
        if (!found) {
          audio.play().then(_ => musicPlayerUpdatePositionState());
          window.alert('End of playlist reached');
        }
      }
    }, 10);
  }
  function musicPlayerToggleShuffle() {
    player.querySelector('.shufflebutton').classList.toggle('active');
    if (player.querySelector('.shufflebutton').classList.contains('active')) {
      if (!window.confirm('Would you like to shuffle all albums on this page?\n\n(It may take several minutes to load all albums into the playlist)')) {
        return;
      }

      // Load all albums from page into the player
      addAllAlbumsAsHeadings();

      // Load unloaded items in playlist
      let delay = 0;
      // Disable permanent storage for speed
      storeTralbumDataPermanentlySwitch = false;
      let n = player.querySelectorAll('.playlist .playlistheading a.notloaded').length + 1;
      if (n > 0) {
        const queueLoadingIndicator = document.body.appendChild(document.createElement('div'));
        queueLoadingIndicator.setAttribute('id', 'queueloadingindicator');
        queueLoadingIndicator.style = 'position:fixed;top:1%;left:10px;background:#d5dce4;color:#033162;font-size:10pt;border:1px solid #033162;z-index:200;';
      }
      const updateLoadingIndicator = function () {
        const div = document.getElementById('queueloadingindicator');
        if (div) {
          div.innerHTML = `Loading albums into playlist. ${--n} albums remaining...`;
          if (n <= 0) {
            div.remove();
            storeTralbumDataPermanentlySwitch = allFeatures.keepLibrary.enabled;
          }
        }
      };
      window.setTimeout(updateLoadingIndicator, 1);
      player.querySelectorAll('.playlist .playlistheading a.notloaded').forEach(async function (notloaded) {
        const url = notloaded.href;
        notloaded.remove();
        cachedTralbumData(url).then(function onCachedTralbumDataLoaded(TralbumData) {
          if (TralbumData) {
            addAlbumToPlaylist(TralbumData, null);
            window.setTimeout(updateLoadingIndicator, 10);
          } else {
            // Delay to avoid rate limit
            window.setTimeout(() => playAlbumFromUrl(url, null).then(updateLoadingIndicator), delay * 1000);
            delay += 4;
          }
        });
      });
    }
  }
  function musicPlayerOnTimelineClick(ev) {
    musicPlayerMovePlayHead(ev);
    const timelineWidth = timeline.offsetWidth - playhead.offsetWidth;
    const clickPercent = (ev.clientX - timeline.getBoundingClientRect().left) / timelineWidth;
    audio.currentTime = currentDuration * clickPercent;
  }
  function musicPlayerOnTimeUpdate() {
    const playpause = player.querySelector('.playpause');
    const timelineWidth = timeline.offsetWidth - playhead.offsetWidth;
    const playPercent = timelineWidth * (audio.currentTime / currentDuration);
    playhead.style.marginLeft = playPercent + 'px';
    if (audio.currentTime === currentDuration) {
      playpause.querySelector('.play').style.display = 'none';
      playpause.querySelector('.busy').style.display = '';
      playpause.querySelector('.pause').style.display = 'none';
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    } else if (audio.paused) {
      playpause.querySelector('.play').style.display = '';
      playpause.querySelector('.busy').style.display = 'none';
      playpause.querySelector('.pause').style.display = 'none';
      if (document.title.startsWith('\u25B6\uFE0E ')) {
        document.title = document.title.substring(3);
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    } else {
      playpause.querySelector('.play').style.display = 'none';
      playpause.querySelector('.busy').style.display = 'none';
      playpause.querySelector('.pause').style.display = '';
      if (!document.title.startsWith('\u25B6\uFE0E ')) {
        document.title = '\u25B6\uFE0E ' + document.title;
      }
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    }
    player.querySelector('.durationDisplay .current').innerHTML = humanDuration(audio.currentTime);
  }
  function musicPlayerUpdateBufferBar() {
    if (currentDuration) {
      if (audio.buffered.length > 0) {
        bufferbar.style.width = Math.min(100, 1 + parseInt(100 * audio.buffered.end(0) / currentDuration)) + '%';
      } else {
        bufferbar.style.width = '100%';
      }
    } else {
      bufferbar.style.width = '0px';
    }
  }
  function musicPlayerShowBusy(ev) {
    const playpause = player.querySelector('.playpause');
    playpause.querySelector('.play').style.display = 'none';
    playpause.querySelector('.busy').style.display = '';
    playpause.querySelector('.pause').style.display = 'none';
  }
  function musicPlayerMovePlayHead(event) {
    const newMargLeft = event.clientX - timeline.getBoundingClientRect().left;
    const timelineWidth = timeline.offsetWidth - playhead.offsetWidth;
    if (newMargLeft >= 0 && newMargLeft <= timelineWidth) {
      playhead.style.marginLeft = newMargLeft + 'px';
    }
    if (newMargLeft < 0) {
      playhead.style.marginLeft = '0px';
    }
    if (newMargLeft > timelineWidth) {
      playhead.style.marginLeft = timelineWidth + 'px';
    }
  }
  function musicPlayerOnPlayheadMouseDown() {
    onPlayHead = true;
    window.addEventListener('mousemove', musicPlayerMovePlayHead, true);
    audio.removeEventListener('timeupdate', musicPlayerOnTimeUpdate, false);
  }
  function musicPlayerOnPlayheadMouseUp(event) {
    if (onPlayHead) {
      musicPlayerMovePlayHead(event);
      window.removeEventListener('mousemove', musicPlayerMovePlayHead, true);
      // change current time
      const timelineWidth = timeline.offsetWidth - playhead.offsetWidth;
      const clickPercent = (event.clientX - timeline.getBoundingClientRect().left) / timelineWidth;
      audio.currentTime = currentDuration * clickPercent;
      audio.addEventListener('timeupdate', musicPlayerOnTimeUpdate, false);
    }
    onPlayHead = false;
  }
  function musicPlayerOnVolumeClick(ev) {
    const volSlider = player.querySelector('.vol-slider');
    const sliderWidth = volSlider.offsetWidth;
    const percent = (ev.clientX - volSlider.getBoundingClientRect().left) / sliderWidth;
    audio.logVolume = percent > 0.9 ? 1.0 : percent;
    GM.setValue('volume', audio.logVolume);
  }
  function musicPlayerOnVolumeWheel(ev) {
    ev.preventDefault();
    const direction = Math.min(Math.max(-1.0, ev.deltaY), 1.0);
    audio.logVolume = Math.min(Math.max(0.0, audio.logVolume - 0.05 * direction), 1.0);
    GM.setValue('volume', audio.logVolume);
  }
  function musicPlayerOnMuteClick(ev) {
    if (audio.logVolume < 0.01) {
      if ('lastvolume' in audio.dataset && audio.dataset.lastvolume) {
        audio.logVolume = audio.dataset.lastvolume;
        GM.setValue('volume', audio.logVolume);
      } else {
        audio.logVolume = 1.0;
      }
    } else {
      audio.dataset.lastvolume = audio.logVolume;
      audio.logVolume = 0.0;
    }
  }
  function musicPlayerOnVolumeChanged(ev) {
    let icons;
    if (NOEMOJI) {
      const muteIcon = `<img style="width:20px" src="${speakerIconMuteSrc}" alt="\uD83D\uDD07">`;
      const lowIcon = `<img style="width:20px" src="${speakerIconLowSrc}" alt="\uD83D\uDD07">`;
      const middleIcon = `<img style="width:20px" src="${speakerIconMiddleSrc}" alt="\uD83D\uDD07">`;
      const highIcon = `<img style="width:20px" src="${speakerIconHighSrc}" alt="\uD83D\uDD07">`;
      icons = [muteIcon, lowIcon, middleIcon, highIcon];
    } else {
      icons = ['\uD83D\uDD07', '\uD83D\uDD08', '\uD83D\uDD09', '\uD83D\uDD0A'];
    }
    const percent = audio.logVolume;
    const volSlider = player.querySelector('.vol-slider');
    volSlider.querySelector('.vol-amt').style.width = parseInt(100 * percent) + '%';
    const volIconWrapper = player.querySelector('.vol-icon-wrapper');
    volIconWrapper.title = 'Mute (' + parseInt(percent * 100) + '%)';
    if (percent < 0.05) {
      volIconWrapper.innerHTML = icons[0];
    } else if (percent < 0.3) {
      volIconWrapper.innerHTML = icons[1];
    } else if (percent < 0.8) {
      volIconWrapper.innerHTML = icons[2];
    } else {
      volIconWrapper.innerHTML = icons[3];
    }
  }
  function musicPlayerOnEnded(ev) {
    musicPlayerNextSong();
    window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({
      block: 'nearest'
    }), 200);
  }
  function musicPlayerOnPlaylistClick(ev, contextMenuRoot) {
    const li = this;
    if (ev.ctrlKey && player.querySelector('.playlist .isselected')) {
      // Select multiple with ctrlKey
      ev.preventDefault();
      musicPlayerContextMenuCtrl.call(li, ev);
      return;
    }
    if (ev.shiftKey && musicPlayerContextMenuLastSelectedLi && musicPlayerContextMenuLastSelectedLi.classList.contains('isselected')) {
      // Select multiple with shift key
      ev.preventDefault();
      if (musicPlayerContextMenuShift.call(li, ev)) {
        return;
      }
    }
    musicPlayerNextSong(li);
    if (contextMenuRoot) {
      contextMenuRoot.remove();
    }
  }
  function removeSelectedFromPlaylist(ev, contextMenuRoot) {
    player.querySelectorAll('.playlist .isselected').forEach(function (li) {
      if (li.classList.contains('playlistentry')) {
        let walk = li.previousElementSibling;
        let remainingTrackN = 0;
        while (walk.classList.contains('playlistentry')) {
          remainingTrackN++;
          walk = walk.previousElementSibling;
        }
        walk = li.nextElementSibling;
        while (walk.classList.contains('playlistentry')) {
          remainingTrackN++;
          walk = walk.nextElementSibling;
        }
        if (remainingTrackN === 0) {
          // If this is last song of album, then remove also album
          walk = li.previousElementSibling;
          while (walk) {
            if (walk.classList.contains('playlistheading')) {
              walk.remove();
              break;
            }
            walk = walk.previousElementSibling;
          }
        }
        // Remove track
        li.remove();
      } else {
        // Remove album
        let next = li.nextElementSibling;
        while (next && next.classList.contains('playlistentry')) {
          next.remove();
          next = li.nextElementSibling;
        }
        li.remove();
      }
    });
    if (contextMenuRoot) {
      contextMenuRoot.remove();
    }
  }
  function musicPlayerOnPlaylistHeadingClick(ev, contextMenuRoot) {
    const li = this;
    const a = li.querySelector('a[href]');
    if (a && a.classList.contains('notloaded')) {
      const url = a.href;
      cachedTralbumData(url).then(function onCachedTralbumDataLoaded(TralbumData) {
        li.remove();
        if (TralbumData) {
          addAlbumToPlaylist(TralbumData);
        } else {
          playAlbumFromUrl(url);
        }
      });
    } else if (a && li.nextElementSibling) {
      li.nextElementSibling.click();
    }
    if (contextMenuRoot) {
      contextMenuRoot.remove();
    }
  }
  let musicPlayerContextMenuLastSelectedLi = null;
  function musicPlayerContextMenuCtrl(ev) {
    const li = this;
    li.classList.toggle('isselected');
    if (li.classList.contains('isselected')) {
      musicPlayerContextMenuLastSelectedLi = li;
    }
  }
  function musicPlayerContextMenuShift(ev) {
    const li = this;
    // Find the last selected element (i.e. in which direction we need to go)
    let dir = 0;
    let walk = li.previousElementSibling;
    while (walk && dir === 0) {
      if (walk === musicPlayerContextMenuLastSelectedLi) {
        dir = -1;
      }
      walk = walk.previousElementSibling;
    }
    walk = li.nextElementSibling;
    while (walk && dir === 0) {
      if (walk === musicPlayerContextMenuLastSelectedLi) {
        dir = 1;
        break;
      }
      walk = walk.nextElementSibling;
    }
    // Select every track in-between
    if (dir === -1) {
      walk = li.previousElementSibling;
      while (walk !== musicPlayerContextMenuLastSelectedLi) {
        if (walk.classList.contains('playlistentry')) {
          walk.classList.add('isselected');
        }
        walk = walk.previousElementSibling;
      }
      li.classList.add('isselected');
      return true;
    } else if (dir === 1) {
      walk = li.nextElementSibling;
      while (walk !== musicPlayerContextMenuLastSelectedLi) {
        if (walk.classList.contains('playlistentry')) {
          walk.classList.add('isselected');
        }
        walk = walk.nextElementSibling;
      }
      li.classList.add('isselected');
      return true;
    } else {
      return false;
    }
  }
  function musicPlayerContextMenu(ev) {
    const li = this;
    if (ev.ctrlKey && player.querySelector('.playlist .isselected')) {
      // Select multiple with ctrl key
      musicPlayerContextMenuCtrl.call(li, ev);
      return;
    }
    if (ev.shiftKey && musicPlayerContextMenuLastSelectedLi && musicPlayerContextMenuLastSelectedLi.classList.contains('isselected')) {
      // Select multiple with shift key
      if (musicPlayerContextMenuShift.call(li, ev)) {
        return;
      }
    }
    player.querySelectorAll('.playlist .isselected').forEach(e => e.classList.remove('isselected'));
    const oldMenu = document.getElementById('discographyplayer_contextmenu');
    if (oldMenu) {
      removeViaQuerySelector('#discographyplayer_contextmenu');
      if (li.dataset.id && li.dataset.id === oldMenu.dataset.id) {
        return;
      }
    }
    li.classList.add('isselected');
    musicPlayerContextMenuLastSelectedLi = li;
    const div = document.body.appendChild(document.createElement('div'));
    li.dataset.id = Math.random();
    div.dataset.id = li.dataset.id;
    div.setAttribute('id', 'discographyplayer_contextmenu');
    div.style.left = ev.pageX + 11 + 'px';
    div.style.top = ev.pageY + 'px';
    const menuEntries = [];
    if (li.classList.contains('playlistentry') || li.classList.contains('playlistheading')) {
      menuEntries.push(['Remove selected', 'Remove selected tracks or albums from playlist\nSelect more with CTRL + Right click', removeSelectedFromPlaylist]);
    }
    if (li.classList.contains('playlistentry')) {
      menuEntries.push(['Play track', 'Start playback', musicPlayerOnPlaylistClick]);
    }
    if (li.classList.contains('playlistheading')) {
      menuEntries.push(['Play album', 'Start playback', musicPlayerOnPlaylistHeadingClick]);
    }
    menuEntries.forEach(function (menuEntry) {
      const subMenu = div.appendChild(document.createElement('div'));
      subMenu.classList.add('contextmenu_submenu');
      subMenu.appendChild(document.createTextNode(menuEntry[0]));
      subMenu.setAttribute('title', menuEntry[1]);
      subMenu.addEventListener('click', function (clickEvent) {
        menuEntry[2].call(li, clickEvent, div);
      });
    });
  }
  function musicPlayerOnPlaylistContextMenu(ev) {
    ev.preventDefault();
    musicPlayerContextMenu.call(this, ev);
  }
  function musicPlayerOnPlaylistHeadingContextMenu(ev) {
    ev.preventDefault();
    musicPlayerContextMenu.call(this, ev);
  }
  function musicPlayerFavicon(url) {
    removeViaQuerySelector(document.head, 'link[rel*=icon]');
    const link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = url;
    document.head.appendChild(link);
  }
  function musicPlayerCollectWishlistClick(ev) {
    ev.preventDefault();
    if (player.querySelector('.collect-wishlist').dataset === 'own') {
      return;
    }
    let url = player.querySelector('.collect-wishlist').dataset.albumUrl;
    if (this.classList.contains('track') && player.querySelector('.collect-wishlist').dataset.trackUrl) {
      // Wishlist track
      url = player.querySelector('.collect-wishlist').dataset.trackUrl;
    }
    player.querySelectorAll('.collect-wishlist>*').forEach(function (e) {
      e.style.display = 'none';
    });
    window.open(url + '#collect-wishlist');
  }
  async function musicPlayerCollectListenedClick(ev) {
    ev.preventDefault();
    const collectListened = player.querySelector('.collect-listened');
    const url = collectListened.dataset.albumUrl;
    window.setTimeout(function musicPlayerCollectListenedResetTimeout() {
      player.querySelectorAll('.collect-listened>*').forEach(function (e) {
        e.style.display = 'none';
      });
      player.querySelector('.collect-listened .listened-saving').style.display = 'inline-block';
      player.querySelector('.collect-listened').style.cursor = 'wait';
    }, 0);
    let albumData = await myAlbumsGetAlbum(url);
    if (!albumData) {
      albumData = await myAlbumsNewFromUrl(url, {});
    }
    if (albumData.listened) {
      albumData.listened = false;
    } else {
      albumData.listened = new Date().toJSON();
    }
    collectListened.dataset.listened = albumData.listened;
    await myAlbumsUpdateAlbum(albumData);
    player.querySelectorAll('.collect-listened>*').forEach(function (e) {
      e.style.display = 'none';
    });
    if (albumData.listened) {
      player.querySelector('.collect-listened .listened').style.display = 'inline-block';
    } else {
      player.querySelector('.collect-listened .mark-listened').style.display = 'inline-block';
    }
    player.querySelector('.collect-listened').style.cursor = '';
    window.setTimeout(makeAlbumLinksGreat, 100);
  }
  function musicPlayerUpdatePositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      console.log('Updating position state...');
      navigator.mediaSession.setPositionState({
        duration: audio.duration || currentDuration || 180,
        playbackRate: audio.playbackRate,
        position: audio.currentTime
      });
    }
  }
  function musicPlayerCookieChannel(onStopEventCb) {
    if (!BANDCAMPDOMAIN) {
      return;
    }
    window.addEventListener('message', function onMessage(event) {
      // Receive messages from the cookie channel event handler
      if (event.origin === document.location.protocol + '//' + document.location.hostname && event.data && typeof event.data === 'object' && 'discographyplayerCookiechannelPlaylist' in event.data && event.data.discographyplayerCookiechannelPlaylist.length >= 2 && event.data.discographyplayerCookiechannelPlaylist[1] === 'stop') {
        onStopEventCb(event.data.discographyplayerCookiechannelPlaylist);
      }
    });
    const script = document.createElement('script');
    script.innerHTML = `
  if(typeof Cookie !== 'undefined') {
    var channel = new Cookie.CommChannel('playlist')
    channel.send('stop')
    channel.subscribe(function(a,b) {
      window.postMessage({'discographyplayerCookiechannelPlaylist': b}, document.location.href)
      })
    channel.startListening()
    window.addEventListener('message', function onMessage (event) {
      // Receive messages from the user script
      if (event.origin === document.location.protocol + '//' + document.location.hostname
      && event.data && typeof(event.data) === 'object' && 'discographyplayerCookiechannelPlaylist' in event.data
      && event.data.discographyplayerCookiechannelPlaylist === 'sendstop') {
        channel.send('stop')
      }
    })
    window.addEventListener('unload', function(event) {
      channel.cleanup()
    })
  }
  `;
    document.head.appendChild(script);
  }
  function musicPlayerCookieChannelSendStop(onStopEventCb) {
    if (BANDCAMPDOMAIN) {
      window.postMessage({
        discographyplayerCookiechannelPlaylist: 'sendstop'
      }, document.location.href);
    }
  }
  function musicPlayerSaveState() {
    // Add remaining albums as headings
    addAllAlbumsAsHeadings();
    // Remove context menu and selection, we don't want to restore those
    player.querySelectorAll('.playlist .isselected').forEach(e => e.classList.remove('isselected'));
    removeViaQuerySelector('#discographyplayer_contextmenu');
    let startPlaybackIndex = false;
    const playlistEntries = player.querySelectorAll('.playlist .playlistentry');
    for (let i = 0; i < playlistEntries.length; i++) {
      if (playlistEntries[i].classList.contains('playing')) {
        startPlaybackIndex = i;
        break;
      }
    }
    const startPlaybackTime = audio.currentTime;
    return GM.setValue('musicPlayerState', JSON.stringify({
      time: new Date().getTime(),
      htmlPlaylist: player.querySelector('.playlist').innerHTML,
      startPlayback: !audio.paused,
      startPlaybackIndex,
      startPlaybackTime,
      shuffleActive: player.querySelector('.shufflebutton').classList.contains('active')
    }));
  }
  function musicPlayerRestoreState(state) {
    if (!allFeatures.discographyplayerPersist.enabled) {
      return;
    }
    if (state.time + 1000 * 30 < new Date().getTime()) {
      // Saved state expires after 30 seconds
      return;
    }

    // Re-create music player
    musicPlayerCreate();
    player.querySelector('.playlist').innerHTML = state.htmlPlaylist;
    const playlistEntries = player.querySelectorAll('.playlist .playlistentry');
    playlistEntries.forEach(function addPlaylistEntryOnClick(li) {
      li.addEventListener('click', musicPlayerOnPlaylistClick);
      li.addEventListener('contextmenu', musicPlayerOnPlaylistContextMenu);
    });
    player.querySelectorAll('.playlist .playlistheading').forEach(function addPlaylistHeadingEntryOnClick(li) {
      li.addEventListener('click', musicPlayerOnPlaylistHeadingClick);
      li.addEventListener('contextmenu', musicPlayerOnPlaylistHeadingContextMenu);
    });
    if (state.startPlaybackIndex !== false) {
      player.querySelectorAll('.playlist .playing').forEach(function (el) {
        el.classList.remove('playing');
      });
      playlistEntries[state.startPlaybackIndex].classList.add('playing');
      window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({
        block: 'nearest'
      }), 200);
    }
    // Start playback
    if (state.startPlayback && state.startPlaybackIndex !== false) {
      musicPlayerPlaySong(playlistEntries[state.startPlaybackIndex], state.startPlaybackTime);
    }
    if ('shuffleActive' in state && state.shuffleActive) {
      player.querySelector('.shufflebutton').classList.add('active');
    }
  }
  function musicPlayerToggleMinimize(ev, hide) {
    if (hide || player.style.bottom !== '-57px') {
      player.style.bottom = '-57px';
      this.classList.add('minimized');
    } else {
      player.style.bottom = '0px';
      this.classList.remove('minimized');
    }
  }
  function musicPlayerPlaylistFullHeight() {
    // Extend the playlist to the full height of the window
    if ('mode' in this.dataset && this.dataset.mode === 'full_height') {
      // Already in full height mode
      return;
    }
    // Store width so it does not change on multiple mouse-overs
    this.dataset.mode = 'full_height';
    let width = this.clientWidth;
    if ('width' in this.dataset) {
      width = this.dataset.width;
    } else {
      this.dataset.width = width;
    }
    // Set CSS to full height
    this.style.position = 'fixed';
    this.style.maxHeight = '100%';
    this.style.height = '100%';
    this.style.maxWidth = `${width}px`;
    this.style.width = `${width}px`;
    this.style.top = '0px';
  }
  function musicPlayerPlaylistNormalHeight() {
    // Revert the playlist to the normal height of the discography player
    if ('mode' in this.dataset && this.dataset.mode !== 'full_height') {
      // Already in normal height mode
      return;
    }
    if (document.getElementById('discographyplayer_contextmenu')) {
      // Context menu is open, don't change the height
      return;
    }
    this.dataset.mode = 'normal';

    // Revert CSS
    this.style.position = '';
    this.style.maxHeight = '';
    this.style.maxWidth = '';
    this.style.top = '';
  }
  function musicPlayerClose() {
    if (player) {
      player.style.display = 'none';
    }
    if (audio) {
      audio.pause();
    }
    document.querySelectorAll('img.albumIsCurrentlyPlaying').forEach(img => img.classList.remove('albumIsCurrentlyPlaying'));
    document.querySelectorAll('.albumIsCurrentlyPlayingIndicator').forEach(div => div.remove());
  }
  function musicPlayerCreate() {
    if (player) {
      player.style.display = 'block';
      return;
    }
    musicPlayerCookieChannel(_ => musicPlayerStop());
    const img1px = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mOsmLZvJgAFwQJn5VVZ5QAAAABJRU5ErkJggg==';
    const listenedListUrl = findUserProfileUrl() + '#listened-tab';
    const checkSymbol = NOEMOJI ? '✓' : '✔';
    player = document.createElement('div');
    document.body.appendChild(player);
    player.id = 'discographyplayer';
    player.innerHTML = `
<div class="col col25 nowPlaying">
  <div class="currentlyPlaying">
    <a class="cover" target="_blank" href="#">
      <img src="${img1px}">
    </a>
    <div class="info">
      <a class="link" target="_blank" href="#">
        <div class="title">◧◩◨▧■□▩</div>
        <div class="artist">by <span>◩▧◧□ ◩◨▧ ■◩▩</span></div>
        <div>from <span class="album">◨■■▩ ▧◨□</span></div>
      </a>
    </div>
  </div>
  <div class="nextInRow">
    <a class="cover" target="_blank" href="#">
      <img src="${img1px}">
    </a>
    <div class="info">
      <a class="link" target="_blank" href="#">
        <div class="title">◧◩◨▧■□▩</div>
        <div>by <span class="artist">◩▧◧□ ◩◨▧ ■◩▩</span></div>
        <div>from <span class="album">◨■■▩ ▧◨□</span></div>
      </a>
    </div>
  </div>
</div>
<div class="col col25 colcontrols">
  <audio autoplay="autoplay" preload="auto"></audio>
  <div class="audioplayer">
    <div id="timeline">
      <div id="bufferbar" class="bufferbaranimation"></div>
      <div id="playhead"></div>
    </div>
    <div class="controls">

      <div class="prevalbum" title="Previous album">
        <div class="arrowbutton prevalbum-icon"></div>
      </div>

      <div class="prev" title="Previous song">
        <div class="arrowbutton prev-icon"></div>
      </div>

      <div class="playpause" title="Play/Pause">
        <div class="play" style="display: none;"></div>
        <div class="busy" style="display: none;"></div>
        <div class="pause" style=""></div>
      </div>

      <div class="next" title="Next song">
        <div class="arrowbutton next-icon"></div>
      </div>

      <div class="nextalbum" title="Next album">
        <div class="arrowbutton nextalbum-icon"></div>
      </div>

      <div class="shuffleswitch" title="Shuffle">
        <div class="shufflebutton" style="background-image:${spriteRepeatShuffle}"></div>
      </div>

    </div>
    
    <div class="durationDisplay"><span class="current">-</span>/<span class="total">-</span></div>

    <a class="downloadlink" title="Download mp3">
      ⭳
    </a>
    <br class="clb">
  </div>
</div>
<div class="col col35">
  <ol class="playlist"></ol>
</div>
<div class="col col15 colcontrols colvolumecontrols">

  <div class="vol">
      <div class="vol-icon-wrapper" title="Mute">
          🔊
      </div>
      <div class="vol-slider">
          <div class="vol-amt" style="width: 100%;"></div>
          <div class="vol-bg"></div>
      </div>
  </div>

  <div class="collect">
    <div class="collect-wishlist">
      <a class="wishlist-default" href="https://bandcamp.com/wishlist">Wishlist</a>

      <span class="wishlist-add">
        <span class="bc-ui2 icon add-item-icon"></span>
        <span class="add-item-label track" title="Add this song to your wishlist">Add song</span>
        <span class="slash">/</span>
        <span class="add-item-label album" title="Add this album to your wishlist">Add album to wishlist</span>
      </span>
      <span class="wishlist-collected">
        <span class="bc-ui2 icon collected-item-icon"></span>
        <span>In Wishlist</span>
      </span>
      <span class="wishlist-own" title="You own this album">
        <span class="bc-ui2 icon own-item-icon"></span>
        <span>You own this</span>
      </span>
      <span class="wishlist-saving">
        Saving....
      </span>
    </div>
    <div class="collect-listened">
      <a class="listened-default" href="${listenedListUrl}">
        Played albums
        </a>
      <span class="listened" title="Mark album as NOT played">
        <span class="listened-symbol">${checkSymbol}</span>
        <span class="listened-label">Played</span>
      </span>
      <span class="mark-listened" title="Mark album as played">
        <span class="mark-listened-symbol">${checkSymbol}</span>
        <span class="mark-listened-label">Mark as played</span>
      </span>
      <span class="listened-saving">
        Saving...
      </span>
    </div>
  </div>

  <br class="cll">
  <div class="minimizebutton">
    <span class="minimized" title="Maximize player">&uarr;</span>
    <span class="maximized" title="Minimize player">&darr;</span>
  </div>
  <div class="closebutton" title="Close player">x</div>
</div>`;
    addStyle(discographyplayerCSS);
    if (allFeatures.discographyplayerSidebar.enabled) {
      // Sidebar discographyplayer
      addStyle(discographyplayerSidebarCSS);
    }
    audio = player.querySelector('audio');
    addLogVolume(audio);
    getStoredVolume(function setVolumeCallback(volume) {
      audio.logVolume = volume;
    });
    playhead = player.querySelector('#playhead');
    bufferbar = player.querySelector('#bufferbar');
    timeline = player.querySelector('#timeline');
    player.querySelector('.minimizebutton').addEventListener('click', musicPlayerToggleMinimize);
    player.querySelector('.closebutton').addEventListener('click', musicPlayerClose);
    audio.addEventListener('ended', musicPlayerOnEnded);
    audio.addEventListener('timeupdate', musicPlayerOnTimeUpdate);
    audio.addEventListener('volumechange', musicPlayerOnVolumeChanged);
    audio.addEventListener('canplaythrough', function onCanPlayThrough() {
      currentDuration = audio.duration;
      player.querySelector('.durationDisplay .total').innerHTML = humanDuration(currentDuration);
    });
    timeline.addEventListener('click', musicPlayerOnTimelineClick, false);
    playhead.addEventListener('mousedown', musicPlayerOnPlayheadMouseDown, false);
    window.addEventListener('mouseup', musicPlayerOnPlayheadMouseUp, false);
    player.querySelector('.prevalbum').addEventListener('click', musicPlayerPrevAlbum);
    player.querySelector('.prev').addEventListener('click', musicPlayerPrev);
    player.querySelector('.playpause').addEventListener('click', musicPlayerPlay);
    player.querySelector('.next').addEventListener('click', musicPlayerNext);
    player.querySelector('.nextalbum').addEventListener('click', musicPlayerNextAlbum);
    player.querySelector('.shuffleswitch').addEventListener('click', musicPlayerToggleShuffle);
    player.querySelector('.vol-slider').addEventListener('click', musicPlayerOnVolumeClick);
    player.querySelector('.vol').addEventListener('wheel', musicPlayerOnVolumeWheel, {
      passive: false
    });
    player.querySelector('.vol-icon-wrapper').addEventListener('click', musicPlayerOnMuteClick);
    player.querySelector('.collect-wishlist .track').addEventListener('click', musicPlayerCollectWishlistClick);
    player.querySelector('.collect-wishlist .album').addEventListener('click', musicPlayerCollectWishlistClick);
    player.querySelector('.collect-listened').addEventListener('click', musicPlayerCollectListenedClick);
    player.querySelector('.downloadlink').addEventListener('click', function onDownloadLinkClick(ev) {
      const addSpinner = el => el.classList.add('downloading');
      const removeSpinner = el => el.classList.remove('downloading');
      downloadMp3FromLink(ev, this, addSpinner, removeSpinner);
    });
    if (allFeatures.discographyplayerFullHeightPlaylist.enabled && !allFeatures.discographyplayerSidebar.enabled) {
      player.querySelector('.playlist').addEventListener('mouseover', musicPlayerPlaylistFullHeight);
      player.querySelector('.playlist').addEventListener('mouseout', musicPlayerPlaylistNormalHeight);
    }
    if (NOEMOJI) {
      player.querySelector('.downloadlink').innerHTML = '↓';
    }
    window.addEventListener('unload', function onPageUnLoad(ev) {
      if (allFeatures.discographyplayerPersist.enabled && player.style.display !== 'none' && !audio.paused) {
        musicPlayerSaveState();
      }
    });
    window.setInterval(musicPlayerUpdateBufferBar, 1200);
  }
  function addHeadingToPlaylist(title, url, albumLoaded) {
    musicPlayerCreate();
    let content = document.createTextNode('💽 ' + title);
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.appendChild(content);
      content = a;
      a.className = albumLoaded ? 'loaded' : 'notloaded';
      a.title = 'Open album page';
    }
    const li = document.createElement('li');
    li.appendChild(content);
    li.className = 'playlistheading';
    if (!albumLoaded) {
      li.className += ' notloaded';
      li.title = 'Load album into playlist';
    }
    li.addEventListener('click', musicPlayerOnPlaylistHeadingClick);
    li.addEventListener('contextmenu', musicPlayerOnPlaylistHeadingContextMenu);
    player.querySelector('.playlist').appendChild(li);
  }
  function addToPlaylist(startPlayback, data) {
    musicPlayerCreate();
    const li = document.createElement('li');
    if (data.trackNumber != null && data.trackNumber !== 'null') {
      li.appendChild(document.createTextNode((data.trackNumber > 9 ? '' : '0') + data.trackNumber + '. ' + data.artist + ' - ' + data.title));
    } else {
      li.appendChild(document.createTextNode(data.artist + ' - ' + data.title));
    }
    const span = document.createElement('span');
    span.className = 'duration';
    span.appendChild(document.createTextNode(humanDuration(data.duration)));
    li.appendChild(span);
    li.value = data.trackNumber;
    li.dataset.file = data.file;
    li.dataset.title = data.title;
    li.dataset.trackNumber = data.trackNumber;
    li.dataset.duration = data.duration;
    li.dataset.artist = data.artist;
    li.dataset.album = data.album;
    li.dataset.albumUrl = data.albumUrl;
    li.dataset.albumCover = data.albumCover;
    li.dataset.inWishlist = data.inWishlist;
    li.dataset.isPurchased = data.isPurchased;
    li.dataset.isDownloadable = data.isDownloadable;
    li.dataset.trackUrl = data.trackUrl;
    li.addEventListener('click', musicPlayerOnPlaylistClick);
    li.addEventListener('contextmenu', musicPlayerOnPlaylistContextMenu);
    li.className = 'playlistentry';
    player.querySelector('.playlist').appendChild(li);
    if (startPlayback) {
      player.querySelectorAll('.playlist .playing').forEach(function (el) {
        el.classList.remove('playing');
      });
      li.classList.add('playing');
      musicPlayerPlaySong(li);
      window.setTimeout(() => player.querySelector('.playlist .playing').scrollIntoView({
        block: 'nearest'
      }), 200);
    }
  }
  function addAlbumToPlaylist(TralbumData, startPlaybackIndex = 0) {
    console.log(TralbumData);
    let i = 0;
    const artist = TralbumData.artist;
    const album = TralbumData.current.title;
    const albumUrl = document.location.protocol + '//' + albumKey(TralbumData.url);
    const albumCover = `https://f4.bcbits.com/img/a${TralbumData.art_id}_2.jpg`;
    addHeadingToPlaylist(album, 'url' in TralbumData ? TralbumData.url : false, true);
    let streamable = 0;
    for (const key in TralbumData.trackinfo) {
      const track = TralbumData.trackinfo[key];
      if (!track.file) {
        continue;
      }
      const trackNumber = track.track_num;
      const file = track.file[Object.keys(track.file)[0]];
      const title = track.title;
      const duration = track.duration;
      const trackUrl = track.title_link;
      const inWishlist = 'tralbum_collect_info' in TralbumData && 'is_collected' in TralbumData.tralbum_collect_info && TralbumData.tralbum_collect_info.is_collected;
      const isDownloadable = track.is_downloadable === true;
      const isPurchased = 'tralbum_collect_info' in TralbumData && 'is_purchased' in TralbumData.tralbum_collect_info && TralbumData.tralbum_collect_info.is_purchased;
      addToPlaylist(startPlaybackIndex === i++, {
        file,
        title,
        trackNumber,
        trackUrl,
        duration,
        artist,
        album,
        albumUrl,
        albumCover,
        inWishlist,
        isDownloadable,
        isPurchased
      });
      streamable++;
    }
    if (streamable === 0) {
      const li = document.createElement('li');
      li.appendChild(document.createTextNode((NOEMOJI ? '\u27C1' : '\uD83D\uDE22') + ' Album is not streamable'));
      player.querySelector('.playlist').appendChild(li);
    }
    player.querySelectorAll('.playlist .playlistheading a.notloaded').forEach(function (el) {
      // Move unloaded items to the end
      el.parentNode.parentNode.appendChild(el.parentNode);
    });
  }
  function addAllAlbumsAsHeadings() {
    const as = document.querySelectorAll('.music-grid .music-grid-item a[href*="/album/"],.music-grid .music-grid-item a[href*="/track/"]');
    const lis = player.querySelectorAll('.playlist .playlistentry');
    const unloadedAs = player.querySelectorAll('.playlist .playlistheading.notloaded a');
    const isAlreadyInPlaylist = function (url) {
      for (let i = 0; i < lis.length; i++) {
        if (albumKey(lis[i].dataset.albumUrl) === albumKey(url)) {
          return true;
        }
      }
      for (let i = 0; i < unloadedAs.length; i++) {
        if (albumKey(unloadedAs[i].href) === albumKey(url)) {
          return true;
        }
      }
      return false;
    };
    for (let i = 0; i < as.length; i++) {
      const url = as[i].href;
      // Check if already in playlist
      if (!isAlreadyInPlaylist(url)) {
        const title = ('textContent' in as[i].dataset ? as[i].dataset.textContent : as[i].querySelector('.title').textContent).trim();
        addHeadingToPlaylist(title, url, false);
      }
    }
  }
  let getTralbumDataDelay = 0;
  function getTralbumData(url, cb, retry = true) {
    return new Promise(function getTralbumDataPromise(resolve, reject) {
      GM.xmlHttpRequest({
        method: 'GET',
        url,
        onload: function getTralbumDataOnLoad(response) {
          if (!response.responseText || response.responseText.indexOf('400 Bad Request') !== -1) {
            let msg = '';
            try {
              msg = response.responseText.split('<center>')[1].split('</center>')[0];
            } catch (e) {
              msg = response.responseText;
            }
            window.alert('An error occured. Please clear your cookies of bandcamp.com and try again.\n\nOriginal error:\n' + msg);
            reject(new Error('Too many cookies'));
            return;
          }
          if (!response.responseText || response.responseText.indexOf('429 Too Many Requests') !== -1) {
            if (retry) {
              retry = false;
              getTralbumDataDelay += 3;
              const delay = getTralbumDataDelay;
              console.warn(`getTralbumData(): 429 Too Many Requests. Trying again in ${delay} seconds`);
              window.setTimeout(() => getTralbumDataPromise(resolve, reject), delay * 1000);
              return;
            }
            let msg = '';
            try {
              msg = response.responseText.split('<center>')[1].split('</center>')[0];
            } catch (e) {
              msg = response.responseText;
            }
            window.alert('An error occured. You\'re probably being rate limited by bandcamp.\n\nOriginal error:\n' + msg);
            reject(new Error('429 Too Many Requests'));
            return;
          }
          let TralbumData = null;
          try {
            if (response.responseText.indexOf('var TralbumData =') !== -1) {
              TralbumData = JSON5.parse(response.responseText.split('var TralbumData =')[1].split('\n};\n')[0].replace(/"\s+\+\s+"/, '') + '\n}');
            } else if (response.responseText.indexOf('data-tralbum="') !== -1) {
              const str = decodeHTMLentities(response.responseText.split('data-tralbum="')[1].split('"')[0]);
              TralbumData = JSON.parse(str);
              // Try to add tralbum_collect_info / TralbumCollectInfo
              if (TralbumData && response.responseText.indexOf('data-tralbum-collect-info="') !== -1) {
                const collectInfoStr = decodeHTMLentities(response.responseText.split('data-tralbum-collect-info="')[1].split('"')[0]);
                TralbumData.tralbum_collect_info = JSON.parse(collectInfoStr);
              }
            }
          } catch (e) {
            window.alert('An error occured when parsing TralbumData from url=' + url + '.\n\nOriginal error:\n' + e);
            reject(e);
            return;
          }
          if (TralbumData) {
            correctTralbumData(TralbumData, response.responseText);
            resolve(TralbumData);
          } else {
            const msg = 'Could not parse TralbumData from url=' + url;
            window.alert(msg);
            console.debug(response.responseText);
            reject(new Error(msg));
          }
        },
        onerror: function getTralbumDataOnError(response) {
          console.log('getTralbumData(' + url + ') in onerror() Error: ' + response.status + '\nResponse:\n' + response.responseText + '\n' + ('error' in response ? response.error : ''));
          reject(new Error('error' in response ? response.error : 'getTralbumData failed with GM.xmlHttpRequest.onerror'));
        }
      });
    });
  }
  function correctTralbumData(TralbumDataObj, html) {
    const TralbumData = JSON.parse(JSON.stringify(TralbumDataObj));
    // Corrections for single tracks
    if (TralbumData.current.type === 'track' && TralbumData.current.title.toLowerCase().indexOf('single') === -1) {
      TralbumData.current.title += ' - Single';
    }
    for (let i = 0; i < TralbumData.trackinfo.length; i++) {
      if (TralbumData.trackinfo[i].track_num === null) {
        TralbumData.trackinfo[i].track_num = i + 1;
      }
    }
    // Add tags from html
    if (html && html.indexOf('tags-inline-label') !== -1) {
      const m = html.split('tags-inline-label')[1].split('</div>')[0].match(/\/tag\/[^"]+"/g);
      if (m && m.length > 0) {
        TralbumData.tags = [];
        m.forEach(function (t) {
          t = t.split('/').pop();
          t = t.substring(0, t.length - 1);
          TralbumData.tags.push(t);
        });
      }
    }
    // Remove stuff we don't use to save storage space
    delete TralbumData.current.require_email_0;
    delete TralbumData.current.audit;
    delete TralbumData.current.download_pref;
    delete TralbumData.current.set_price;
    delete TralbumData.current.killed;
    delete TralbumData.current.auto_repriced;
    delete TralbumData.current.minimum_price_nonzero;
    delete TralbumData.current.minimum_price;
    delete TralbumData.current.purchase_url;
    delete TralbumData.current.new_desc_format;
    delete TralbumData.current.private;
    delete TralbumData.current.is_set_price;
    delete TralbumData.current.require_email;
    delete TralbumData.current.upc;
    delete TralbumData.packages;
    delete TralbumData.last_subscription_item;
    delete TralbumData.last_subscription_item;
    delete TralbumData.has_discounts;
    delete TralbumData.is_bonus;
    delete TralbumData.play_cap_data;
    delete TralbumData.client_id_sig;
    delete TralbumData.is_purchased;
    delete TralbumData.items_purchased;
    delete TralbumData.is_private_stream;
    delete TralbumData.is_band_member;
    delete TralbumData.licensed_version_ids;
    delete TralbumData.package_associated_license_id;
    for (let i = 0; i < TralbumData.trackinfo.length; i++) {
      delete TralbumData.trackinfo[i].is_draft;
      delete TralbumData.trackinfo[i].album_preorder;
      delete TralbumData.trackinfo[i].unreleased_track;
      delete TralbumData.trackinfo[i].encoding_error;
      delete TralbumData.trackinfo[i].video_mobile_url;
      delete TralbumData.trackinfo[i].encoding_pending;
      delete TralbumData.trackinfo[i].video_poster_url;
      delete TralbumData.trackinfo[i].video_source_type;
      delete TralbumData.trackinfo[i].video_source_id;
      delete TralbumData.trackinfo[i].video_mobile_url;
      delete TralbumData.trackinfo[i].video_caption;
      delete TralbumData.trackinfo[i].video_featured;
      delete TralbumData.trackinfo[i].video_id;
      for (const attr in TralbumData.trackinfo[i]) {
        if (TralbumData.trackinfo[i][attr] === null) {
          delete TralbumData.trackinfo[i][attr];
        }
      }
    }
    for (const attr in TralbumData) {
      if (TralbumData[attr] === null) {
        delete TralbumData[attr];
      }
    }
    return TralbumData;
  }
  function albumKey(url) {
    if (url.startsWith('/')) {
      url = document.location.hostname + url;
    }
    if (url.indexOf('://') !== -1) {
      url = url.split('://')[1];
    }
    if (url.indexOf('#') !== -1) {
      url = url.split('#')[0];
    }
    if (url.indexOf('?') !== -1) {
      url = url.split('?')[0];
    }
    return url;
  }
  function albumPath(url) {
    if (url.startsWith('/')) {
      return albumKey(url);
    }
    const a = document.createElement('a');
    a.href = url;
    return a.pathname;
  }
  async function storeTralbumData(TralbumData) {
    const expires = TRALBUM_CACHE_HOURS * 3600000;
    const cache = JSON.parse(await GM.getValue('tralbumdata', '{}'));
    for (const prop in cache) {
      // Delete cached values, that are older than 2 hours
      if (new Date().getTime() - new Date(cache[prop].time).getTime() > expires) {
        delete cache[prop];
      }
    }
    TralbumData.time = new Date().toJSON();
    cache[albumKey(TralbumData.url)] = TralbumData;
    await GM.setValue('tralbumdata', JSON.stringify(cache));
    storeTralbumDataPermanently(TralbumData);
  }
  async function cachedTralbumData(url) {
    const expires = TRALBUM_CACHE_HOURS * 3600000;
    const key = albumKey(url);
    const cache = JSON.parse(await GM.getValue('tralbumdata', '{}'));
    for (const prop in cache) {
      // Delete cached values, that are older than 2 hours
      if (new Date().getTime() - new Date(cache[prop].time).getTime() > expires) {
        delete cache[prop];
        continue;
      }
      if (prop === key) {
        return cache[prop];
      }
    }
    return false;
  }
  async function storeTralbumDataPermanently(TralbumData) {
    if (!storeTralbumDataPermanentlySwitch) {
      return;
    }
    const library = JSON.parse(await GM.getValue('tralbumlibrary', '{}'));
    const key = albumKey(TralbumData.url);
    if (key in library) {
      library[key] = Object.assign(library[key], TralbumData);
    } else {
      library[key] = TralbumData;
    }
    await GM.setValue('tralbumlibrary', JSON.stringify(library));
  }
  async function deletePermanentTralbum(url) {
    const library = JSON.parse(await GM.getValue('tralbumlibrary', '{}'));
    const key = albumKey(url);
    if (key in library) {
      delete library[key];
      await GM.setValue('tralbumlibrary', JSON.stringify(library));
      return key;
    }
    return null;
  }
  function playAlbumFromCover(ev, url) {
    let parent = this;
    if (!url) {
      for (let j = 0; parent.tagName !== 'A' && j < 20; j++) {
        parent = parent.parentNode;
      }
      url = parent.href;
    }
    parent.classList.add('discographyplayer_currentalbum');

    // Check if already in playlist
    if (player) {
      musicPlayerCreate();
      const lis = player.querySelectorAll('.playlist .playlistentry');
      for (let i = 0; i < lis.length; i++) {
        if (albumKey(lis[i].dataset.albumUrl) === albumKey(url)) {
          lis[i].click();
          return;
        }
      }
    }

    // Load data
    cachedTralbumData(url).then(function onCachedTralbumDataLoaded(TralbumData) {
      if (TralbumData) {
        addAlbumToPlaylist(TralbumData);
      } else {
        playAlbumFromUrl(url);
      }
    });
  }
  function playAlbumFromUrl(url, startPlaybackIndex = 0) {
    if (!url.startsWith('http')) {
      url = document.location.protocol + '//' + url;
    }
    return getTralbumData(url).then(function onGetTralbumDataLoaded(TralbumData) {
      storeTralbumData(TralbumData);
      return addAlbumToPlaylist(TralbumData, startPlaybackIndex);
    }).catch(function onGetTralbumDataError(e) {
      window.alert('Could not play and load album data from url:\n' + url + '\n' + ('error' in e ? e.error : e));
      console.log(e);
    });
  }
  async function myAlbumsGetAlbum(url) {
    const key = albumKey(url);
    const data = JSON.parse(await GM.getValue('myalbums', '{}'));
    if (key in data) {
      return data[key];
    } else {
      return false;
    }
  }
  async function myAlbumsUpdateAlbum(albumData) {
    const key = albumKey(albumData.url);
    const data = JSON.parse(await GM.getValue('myalbums', '{}'));
    if (key in data) {
      data[key] = Object.assign(data[key], albumData);
    } else {
      data[key] = albumData;
    }
    await GM.setValue('myalbums', JSON.stringify(data));
  }
  async function myAlbumsNewFromUrl(url, fallback) {
    // Get data from cache or load from url
    url = albumKey(url);
    const albumData = fallback || {};
    let TralbumData = await cachedTralbumData(url);
    if (!TralbumData) {
      try {
        TralbumData = await getTralbumData(document.location.protocol + '//' + url);
      } catch (e) {
        console.log('myAlbumsNewFromUrl() Could not load album data from url:\n' + url);
      }
      if (TralbumData) {
        storeTralbumData(TralbumData);
      }
    }
    if (TralbumData) {
      albumData.artist = TralbumData.artist;
      albumData.title = TralbumData.current.title;
      albumData.albumCover = `https://f4.bcbits.com/img/a${TralbumData.art_id}_2.jpg`;
      albumData.releaseDate = TralbumData.current.release_date;
    }
    albumData.url = url;
    albumData.listened = false;
    return albumData;
  }
  function makeAlbumCoversGreat() {
    if (!('makeAlbumCoversGreat' in document.head.dataset)) {
      document.head.dataset.makeAlbumCoversGreat = true;
      const campExplorerCSS = `
.music-grid-item {
  position: relative
}
.music-grid-item .art-play {
  margin-top: -50px;
}
`;
      addStyle(`
.music-grid-item .art-play {
  position: absolute;
  width: 74px;
  height: 54px;
  left: 50%;
  top: 50%;
  margin-left: -36px;
  margin-top: -27px;
  opacity: 0;
  transition: opacity 0.2s;
}
.music-grid-item .art-play-bg {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  background: #000;
  border-radius: 4px;
}
.music-grid-item .art-play-icon {
  position: absolute;
  width: 0;
  height: 0;
  left: 28px;
  top: 17px;
  border-width: 10px 0 10px 17px;
  border-color: transparent transparent transparent #fff;
  border-style: dashed dashed dashed solid;
}
.music-grid-item:hover .art-play {
  opacity: 0.6;
}

${CAMPEXPLORER ? campExplorerCSS : ''}
`);
    }
    const onclick = function onclick(ev) {
      ev.preventDefault();
      playAlbumFromCover.apply(this, ev);
    };
    const artPlay = document.createElement('div');
    artPlay.className = 'art-play';
    artPlay.innerHTML = '<div class="art-play-bg"></div><div class="art-play-icon"></div>';
    if (CAMPEXPLORER) {
      document.querySelectorAll('ul.albums').forEach(e => e.classList.add('music-grid'));
      document.querySelectorAll('ul.albums li.album').forEach(e => e.classList.add('music-grid-item'));
    }

    // Albums and single tracks
    const imgs = document.querySelectorAll('.music-grid .music-grid-item a[href*="/album/"] img,.music-grid .music-grid-item a[href*="/track/"] img');
    for (let i = 0; i < imgs.length; i++) {
      if (imgs[i].parentNode.getElementsByClassName('art-play').length) {
        continue;
      }
      imgs[i].addEventListener('click', onclick);

      // Add play overlay
      const clone = artPlay.cloneNode(true);
      clone.addEventListener('click', onclick);
      imgs[i].parentNode.appendChild(clone);
    }
  }
  function makeTagSearchCoversGreat() {
    const onclick = function onclick(ev) {
      ev.preventDefault();
      const a = this.parentNode.querySelector('.info a[href]');
      playAlbumFromCover.call(this, ev, a.href);
    };
    document.querySelectorAll('.dig-deeper-item').forEach(function (div) {
      const artDiv = div.querySelector('div.art');
      const dumbArtCopy = artDiv.cloneNode(true);
      artDiv.parentNode.replaceChild(dumbArtCopy, artDiv);
      dumbArtCopy.addEventListener('click', onclick);
    });
  }
  async function makeAlbumLinksGreat(parentElement) {
    const doc = parentElement || document;
    const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'));
    if (!('makeAlbumLinksGreat' in document.head.dataset)) {
      document.head.dataset.makeAlbumLinksGreat = true;
      addStyle(`
    .bdp_check_onlinkhover_container { z-index:1002; position:absolute; display:none }
    .bdp_check_onlinkhover_container_shown { display:block; background-color:rgba(255,255,255,0.9); padding:0px 2px 0px 0px; border-radius:5px  }
    .bdp_check_onlinkhover_container:hover { position:absolute; transition: all 300ms linear; background-color:rgba(255,255,255,0.9); padding:0px 10px 0px 7px; border-radius:5px }
    .bdp_check_onchecked_container { z-index:-1; position:absolute; opacity:0.0; margin-top:-2px}
    a:hover .bdp_check_onchecked_container { z-index:1002; position:absolute; transition: opacity 300ms linear; opacity:1.0}

    .bdp_check_onlinkhover_symbol {color:rgba(0,0,50,0.7)}
    .bdp_check_onlinkhover_text {color:rgba(0,0,50,0.7)}
    .bdp_check_onlinkhover_container:hover .bdp_check_onlinkhover_symbol { color:rgba(0,0,100,1.0) }
    .bdp_check_onlinkhover_container:hover .bdp_check_onlinkhover_text { color:rgba(0,100,0,1.0)}
    .bdp_check_onchecked_symbol { color:rgba(0,100,0,0.8) }
    .bdp_check_onchecked_text { color:rgba(150,200,150,0.8) }

    a:hover .bdp_check_onchecked_symbol { text-shadow: 1px 1px #fff; color:rgba(0,50,0,1.0); transition: all 300ms linear }
    a:hover .bdp_check_onchecked_text { text-shadow: 1px 1px #000; color:rgba(200,255,200,0.8); transition: all 300ms linear }

    `);
    }
    const excluded = [...document.querySelectorAll('#carousel-player .now-playing a')];
    excluded.push(...document.querySelectorAll('#discographyplayer a'));
    excluded.push(...document.querySelectorAll('#pastreleases a'));

    /*
    <div class="bdp_check_container bdp_check_onlinkhover_container"><span class="bdp_check_onlinkhover_symbol">\u2610</span> <span class="bdp_check_onlinkhover_text">Check</span></div>
    <div class="bdp_check_container bdp_check_onlinkhover_container"><span class="bdp_check_onlinkhover_symbol">\u1f5f9</span> <span class="bdp_check_onlinkhover_text">Check</span></div>
    <span class="bdp_check_onchecked_symbol">\u2611</span> TITLE <div class="bdp_check_container bdp_check_onchecked_container"><span class="bdp_check_onchecked_text">Played</span></div>
    */

    const onClickSetListened = async function onClickSetListenedAsync(ev) {
      ev.preventDefault();
      let parentA = this;
      for (let j = 0; parentA.tagName !== 'A' && j < 20; j++) {
        parentA = parentA.parentNode;
      }
      window.setTimeout(function showSavingLabel() {
        parentA.style.cursor = 'wait';
        parentA.querySelector('.bdp_check_container').innerHTML = 'Saving...';
      }, 0);
      const url = parentA.href;
      let albumData = await myAlbumsGetAlbum(url);
      if (!albumData) {
        albumData = await myAlbumsNewFromUrl(url, {
          title: this.dataset.textContent
        });
      }
      albumData.listened = new Date().toJSON();
      await myAlbumsUpdateAlbum(albumData);
      window.setTimeout(function hideSavingLabel() {
        parentA.style.cursor = '';
        makeAlbumLinksGreat();
      }, 100);
    };
    const onClickRemoveListened = async function onClickRemoveListenedAsync(ev) {
      ev.preventDefault();
      let parentA = this;
      for (let j = 0; parentA.tagName !== 'A' && j < 20; j++) {
        parentA = parentA.parentNode;
      }
      window.setTimeout(function showSavingLabel() {
        parentA.style.cursor = 'wait';
        parentA.querySelector('.bdp_check_container').innerHTML = 'Saving...';
      }, 0);
      const url = parentA.href;
      const albumData = await myAlbumsGetAlbum(url);
      if (albumData) {
        albumData.listened = false;
        await myAlbumsUpdateAlbum(albumData);
      }
      window.setTimeout(function hideSavingLabel() {
        parentA.style.cursor = '';
        makeAlbumLinksGreat();
      }, 100);
    };
    const mouseOverLink = function onMouseOverLink(ev) {
      const bdpCheckOnlinkhoverContainer = this.querySelector('.bdp_check_onlinkhover_container');
      if (bdpCheckOnlinkhoverContainer) {
        bdpCheckOnlinkhoverContainer.classList.add('bdp_check_onlinkhover_container_shown');
      }
    };
    const mouseOutLink = function onMouseOutLink(ev) {
      const a = this;
      a.dataset.iv = window.setTimeout(function mouseOutLinkTimeout() {
        const div = a.querySelector('.bdp_check_onlinkhover_container');
        if (div) {
          div.classList.remove('bdp_check_onlinkhover_container_shown');
          div.dataset.iv = a.dataset.iv;
        }
      }, 1000);
    };
    const mouseMoveLink = function onMouseLoveLink(ev) {
      if ('iv' in this.dataset) {
        window.clearTimeout(this.dataset.iv);
      }
    };
    const mouseOverDivCheck = function onMouseOverDivCheck(ev) {
      const bdpCheckOnlinkhoverSymbol = this.querySelector('.bdp_check_onlinkhover_symbol');
      if (bdpCheckOnlinkhoverSymbol) {
        bdpCheckOnlinkhoverSymbol.innerText = NOEMOJI ? '\u2611' : '\uD83D\uDDF9';
      }
      if ('iv' in this.dataset) {
        window.clearTimeout(this.dataset.iv);
      }
    };
    const mouseOutDivCheck = function onMouseOutDivCheck(ev) {
      const bdpCheckOnlinkhoverSymbol = this.querySelector('.bdp_check_onlinkhover_symbol');
      if (bdpCheckOnlinkhoverSymbol) {
        bdpCheckOnlinkhoverSymbol.innerText = '\u2610';
      }
    };
    const divCheck = document.createElement('div');
    divCheck.setAttribute('class', 'bdp_check_container bdp_check_onlinkhover_container');
    divCheck.setAttribute('title', 'Mark as played');
    divCheck.innerHTML = '<span class="bdp_check_onlinkhover_symbol">\u2610</span> <span class="bdp_check_onlinkhover_text">Check</span>';
    const divChecked = document.createElement('div');
    divChecked.setAttribute('class', 'bdp_check_container bdp_check_onchecked_container');
    divChecked.innerHTML = '<span class="bdp_check_onchecked_text">Played</span>';
    const spanChecked = document.createElement('span');
    spanChecked.appendChild(document.createTextNode('\u2611 '));
    spanChecked.setAttribute('class', 'bdp_check_onchecked_symbol');
    const a = doc.querySelectorAll('a[href*="/album/"],.music-grid .music-grid-item a[href*="/track/"]');
    let lastKey = '';
    for (let i = 0; i < a.length; i++) {
      if (excluded.indexOf(a[i]) !== -1) {
        continue;
      }
      const key = albumKey(a[i].href);
      if (key === lastKey) {
        // Skip multiple consequent links to same album
        continue;
      }
      const textContent = a[i].textContent.trim();
      if (!textContent) {
        // Skip album covers only
        continue;
      }
      let div;
      if (a[i].dataset.textContent) {
        removeViaQuerySelector(a[i], '.bdp_check_onlinkhover_container');
        removeViaQuerySelector(a[i], '.bdp_check_onchecked_container');
        removeViaQuerySelector(a[i], '.bdp_check_onchecked_symbol');
      } else {
        a[i].dataset.textContent = textContent;
        a[i].addEventListener('mouseover', mouseOverLink);
        a[i].addEventListener('mousemove', mouseMoveLink);
        a[i].addEventListener('mouseout', mouseOutLink);
      }
      if (key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened) {
        div = divChecked.cloneNode(true);
        div.addEventListener('click', onClickRemoveListened);
        const date = new Date(myalbums[key].listened);
        const since = timeSince(date);
        const dateStr = dateFormater(date);
        div.title = since + ' ago\nClick to mark as NOT played';
        div.querySelector('.bdp_check_onchecked_text').appendChild(document.createTextNode(' ' + dateStr));
        const span = spanChecked.cloneNode(true);
        span.title = since + ' ago\nClick to mark as NOT played';
        span.addEventListener('click', onClickRemoveListened);
        const firstText = firstChildWithText(a[i]) || a[i].firstChild;
        firstText.parentNode.insertBefore(span, firstText);
      } else {
        div = divCheck.cloneNode(true);
        div.addEventListener('mouseover', mouseOverDivCheck);
        div.addEventListener('mouseout', mouseOutDivCheck);
        div.addEventListener('click', onClickSetListened);
      }
      a[i].appendChild(div);
      lastKey = key;
    }
  }
  function removeTheTimeHasComeToOpenThyHeartWallet() {
    if ('theTimeHasComeToOpenThyHeartWallet' in document.head.dataset) {
      return;
    }
    document.head.dataset.theTimeHasComeToOpenThyHeartWallet = true;
    document.head.appendChild(document.createElement('script')).innerHTML = `
    Log.debug("theTimeHasComeToOpenThyHeartWallet: start...")
    function removeViaQuerySelector (parent, selector) {
      if (typeof selector === 'undefined') {
        selector = parent
        parent = document
      }
      for (let el = parent.querySelector(selector); el; el = parent.querySelector(selector)) {
        el.remove()
      }
    }
    if (typeof TralbumData !== 'undefined') {
      if (TralbumData.play_cap_data) {
        TralbumData.play_cap_data.streaming_limit = 100
        TralbumData.play_cap_data.streaming_limits_enabled = false
      }
      for(let i = 0; i < TralbumData.trackinfo.length; i++) {
        TralbumData.trackinfo[i].is_capped = false
        TralbumData.trackinfo[i].play_count = 1
      }

      /* // Alternative would be create new player
      TralbumLimits.onPlayerInit = () => true
      TralbumLimits.updatePlayCounts = () => true
      Player.init(TralbumData, AlbumPage.onPlayerInit);
      */

      // Update player with modified TralbumData
      Player.update(TralbumData)
      Log.debug("theTimeHasComeToOpenThyHeartWallet: player updated")
    }

    // Restore lyrics onClick
    function parentByClassName(node, className) {
      while(!node.parentNode.classList.contains(className)) {
        node = node.parentNode
        if (node.parentNode === document.documentElement) {
          return null
        }
      }
      return node.parentNode
    }
    /*
    // seems this is no longer necessary
    function onLyricsClick (ev) {
      ev.preventDefault()
      const tr = parentByClassName(this, 'track_row_view')
      if (tr.classList.contains('current_track')) {
        parentByClassName(tr, 'track_list').classList.toggle('auto_lyrics')
      } else {
        tr.classList.toggle('showlyrics')
      }
    }
    document.querySelectorAll('#track_table .track_row_view .info_link a').forEach(function (a) {
      a.addEventListener('click', onLyricsClick)
    })
    */

    // Hide popup (not really needed, but won't hurt)
    window.setInterval(function() {
      if(document.getElementById('play-limits-dialog-cancel-btn')) {
        document.getElementById('play-limits-dialog-cancel-btn').click()
        window.setTimeout(function() {
          removeViaQuerySelector(document, '.ui-dialog.ui-widget')
          removeViaQuerySelector(document, '.ui-widget-overlay')
        }, 100)
      }
    }, 3000)
    Log.debug("theTimeHasComeToOpenThyHeartWallet: done!")
  `;
  }
  function makeCarouselPlayerGreatAgain() {
    if (player) {
      // Hide/minimize discography player
      const closePlayerOnCarouselIv = window.setInterval(function closePlayerOnCarouselInterval() {
        if (!document.getElementById('carousel-player') || document.getElementById('carousel-player').getClientRects()[0].bottom - window.innerHeight > 0) {
          return;
        }
        if (player.style.display === 'none') {
          // Put carousel player back down in normal position, because discography player is hidden forever
          document.getElementById('carousel-player').style.bottom = '0px';
          window.clearInterval(closePlayerOnCarouselIv);
        } else if (!player.style.bottom) {
          // Minimize discography player and push carousel player up above the minimized player
          musicPlayerToggleMinimize.call(player.querySelector('.minimizebutton'), null, true);
          document.getElementById('carousel-player').style.bottom = player.clientHeight - 57 + 'px';
        }
      }, 5000);
    }
    let addListenedButtonToCarouselPlayerLast = null;
    const addListenedButtonToCarouselPlayer = function listenedButtonOnCarouselPlayer() {
      const url = document.querySelector('#carousel-player a[href]') ? albumKey(document.querySelector('#carousel-player a[href]').href) : null;
      if (url && addListenedButtonToCarouselPlayerLast === url) {
        return;
      }
      if (!url) {
        console.log('No url found in carousel player: `#carousel-player a[href]`');
        return;
      }
      addListenedButtonToCarouselPlayerLast = url;
      removeViaQuerySelector('#carousel-player .carousellistenedstatus');
      const a = document.createElement('a');
      a.className = 'carousellistenedstatus';
      a.addEventListener('click', ev => ev.preventDefault());
      document.querySelector('#carousel-player .controls-extra').insertBefore(a, document.querySelector('#carousel-player .controls-extra').firstChild);
      a.innerHTML = '<span class="listenedstatus">Loading...</span>';
      a.href = 'https://' + url;
      makeAlbumLinksGreat(a.parentNode).then(function () {
        removeViaQuerySelector(a, '.listenedstatus');
        const span = document.createElement('span');
        span.addEventListener('click', function () {
          const span = this;
          span.parentNode.querySelector('.bdp_check_container').click();
          window.setTimeout(function () {
            if (span.parentNode.querySelector('.bdp_check_container').textContent.indexOf('Played') !== -1) {
              span.parentNode.innerHTML = 'Listened';
            } else {
              span.parentNode.innerHTML = 'Unplayed';
            }
          }, 3000);
        });
        if (a.querySelector('.bdp_check_onchecked_text')) {
          span.className = 'listenedstatus listened';
          span.innerHTML = '<span class="listened-symbol">✓</span> <span class="listened-label">Played</span>';
        } else {
          span.className = 'listenedstatus mark-listened';
          span.innerHTML = '<span class="mark-listened-symbol">✓</span> <span class="mark-listened-label">Mark as played</span>';
        }
        a.insertBefore(span, a.firstChild);
        a.dataset.textContent = document.querySelector('#carousel-player .now-playing .info a .artist span').textContent + ' - ' + document.querySelector('#carousel-player .now-playing .info a .title').textContent;
      });
    };
    let lastMediaHubMeta = [null, null];
    const onNotificationClick = function () {
      if (!document.querySelector('#carousel-player .transport .next-icon').classList.contains('disabled')) {
        document.querySelector('#carousel-player .transport .next-icon').click();
      }
    };
    const updateChromePositionState = function () {
      const audio = document.querySelector('body>audio');
      if (audio && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: audio.duration || 180,
          playbackRate: audio.playbackRate,
          position: audio.currentTime
        });
      }
    };
    const addChromeMediaHubToCarouselPlayer = function chromeMediaHubToCarouselPlayer() {
      const title = document.querySelector('#carousel-player .info-progress span[data-bind*="trackTitle"]').textContent.trim();
      const artwork = document.querySelector('#carousel-player .now-playing img').src;
      if (lastMediaHubMeta[0] === title && lastMediaHubMeta[1] === artwork) {
        return;
      }
      lastMediaHubMeta = [title, artwork];
      const artist = document.querySelector('#carousel-player .now-playing .artist span').textContent.trim();
      const album = document.querySelector('#carousel-player .now-playing .title').textContent.trim();

      // Notification
      if (allFeatures.nextSongNotifications.enabled && 'notification' in GM) {
        GM.notification({
          title: document.location.host,
          text: title + '\nby ' + artist + '\nfrom ' + album,
          image: artwork,
          highlight: false,
          silent: true,
          timeout: NOTIFICATION_TIMEOUT,
          onclick: onNotificationClick
        });
      }

      // Media hub
      if ('mediaSession' in navigator) {
        const audio = document.querySelector('body>audio');
        if (audio) {
          navigator.mediaSession.playbackState = !audio.paused ? 'playing' : 'paused';
          updateChromePositionState();
        }
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist,
          album,
          artwork: [{
            src: artwork,
            sizes: '350x350',
            type: 'image/jpeg'
          }]
        });
        if (!document.querySelector('#carousel-player .transport .prev-icon').classList.contains('disabled')) {
          navigator.mediaSession.setActionHandler('previoustrack', () => document.querySelector('#carousel-player .transport .prev-icon').click());
        } else {
          navigator.mediaSession.setActionHandler('previoustrack', null);
        }
        if (!document.querySelector('#carousel-player .transport .next-icon').classList.contains('disabled')) {
          navigator.mediaSession.setActionHandler('nexttrack', () => document.querySelector('#carousel-player .transport .next-icon').click());
        } else {
          navigator.mediaSession.setActionHandler('nexttrack', null);
        }
        const playButton = document.querySelector('#carousel-player .playpause .play');
        if (playButton && playButton.style.display === 'none') {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', function () {
            document.querySelector('#carousel-player .playpause').click();
            navigator.mediaSession.playbackState = 'paused';
          });
        } else {
          navigator.mediaSession.setActionHandler('play', function () {
            document.querySelector('#carousel-player .playpause').click();
            navigator.mediaSession.playbackState = 'playing';
          });
          navigator.mediaSession.setActionHandler('pause', null);
        }
        if (audio) {
          navigator.mediaSession.setActionHandler('seekbackward', function (event) {
            const skipTime = event.seekOffset || DEFAULTSKIPTIME;
            audio.currentTime = Math.max(audio.currentTime - skipTime, 0);
            updateChromePositionState();
          });
          navigator.mediaSession.setActionHandler('seekforward', function (event) {
            const skipTime = event.seekOffset || DEFAULTSKIPTIME;
            audio.currentTime = Math.min(audio.currentTime + skipTime, audio.duration);
            updateChromePositionState();
          });
          try {
            navigator.mediaSession.setActionHandler('stop', function () {
              audio.pause();
              audio.currentTime = 0;
              navigator.mediaSession.playbackState = 'paused';
            });
          } catch (error) {
            console.log('Warning! The "stop" media session action is not supported.');
          }
          try {
            navigator.mediaSession.setActionHandler('seekto', function (event) {
              if (event.fastSeek && 'fastSeek' in audio) {
                audio.fastSeek(event.seekTime);
                return;
              }
              audio.currentTime = event.seekTime;
              updateChromePositionState();
            });
          } catch (error) {
            console.log('Warning! The "seekto" media session action is not supported.');
          }
        }
      }
    };
    window.setInterval(function addListenedButtonToCarouselPlayerInterval() {
      if (!document.getElementById('carousel-player') || document.getElementById('carousel-player').getClientRects()[0].bottom - window.innerHeight > 0) {
        return;
      }
      addListenedButtonToCarouselPlayer();
      addChromeMediaHubToCarouselPlayer();
    }, 2000);
    addStyle(`
  #carousel-player a.carousellistenedstatus:link,#carousel-player a.carousellistenedstatus:visited,#carousel-player a.carousellistenedstatus:hover{
    text-decoration:none;
    cursor:default
  }
  #carousel-player .listened .listened-symbol{
    color:rgb(0,220,50);
    text-shadow:1px 0px #DDD,-1px 0px #DDD,0px -1px #DDD,0px 1px #DDD
  }
  #carousel-player .mark-listened .mark-listened-symbol{
    color:#FFF;
    text-shadow:1px 0px #959595,-1px 0px #959595,0px -1px #959595,0px 1px #959595
  }
  #carousel-player .mark-listened:hover .mark-listened-symbol{
    text-shadow:1px 0px #0AF,-1px 0px #0AF,0px -1px #0AF,0px 1px #0AF
  }
  `);
  }
  async function addListenedButtonToCollectControls() {
    const lastLi = document.querySelector('.share-panel-wrapper-desktop ul li');
    if (!lastLi) {
      window.setTimeout(addListenedButtonToCollectControls, 300);
      return;
    }
    const checkSymbol = NOEMOJI ? '✓' : '✔';
    const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'));
    const key = albumKey(document.location.href);
    const listened = key in myalbums && 'listened' in myalbums[key] && myalbums[key].listened;
    const onClickSetListened = async function onClickSetListenedAsync(ev) {
      ev.preventDefault();
      let parent = this;
      for (let j = 0; parent.tagName !== 'LI' && j < 20; j++) {
        parent = parent.parentNode;
      }
      window.setTimeout(function showSavingLabel() {
        parent.style.cursor = 'wait';
        parent.innerHTML = 'Saving...';
      }, 0);
      const url = document.location.href;
      let albumData = await myAlbumsGetAlbum(url);
      if (!albumData) {
        albumData = await myAlbumsNewFromUrl(url, {
          title: this.dataset.textContent
        });
      }
      albumData.listened = new Date().toJSON();
      await myAlbumsUpdateAlbum(albumData);
      window.setTimeout(addListenedButtonToCollectControls, 100);
    };
    const onClickRemoveListened = async function onClickRemoveListenedAsync(ev) {
      ev.preventDefault();
      let parent = this;
      for (let j = 0; parent.tagName !== 'LI' && j < 20; j++) {
        parent = parent.parentNode;
      }
      window.setTimeout(function showSavingLabel() {
        parent.style.cursor = 'wait';
        parent.innerHTML = 'Saving...';
      }, 0);
      const url = document.location.href;
      const albumData = await myAlbumsGetAlbum(url);
      if (albumData) {
        albumData.listened = false;
        await myAlbumsUpdateAlbum(albumData);
      }
      window.setTimeout(addListenedButtonToCollectControls, 100);
    };
    removeViaQuerySelector('#discographyplayer_sharepanel');
    const li = lastLi.parentNode.appendChild(document.createElement('li'));
    const button = li.appendChild(document.createElement('span'));
    const icon = button.appendChild(document.createElement('span'));
    const a = button.appendChild(document.createElement('a'));
    li.setAttribute('id', 'discographyplayer_sharepanel');
    a.addEventListener('click', ev => ev.preventDefault());
    icon.className = 'sharepanelchecksymbol';
    if (listened) {
      const date = new Date(listened);
      const since = timeSince(date);
      button.title = since + '\nClick to mark as NOT played';
      button.addEventListener('click', onClickRemoveListened);
      icon.style.color = 'rgb(0,220,50)';
      icon.style.textShadow = '1px 0px #DDD,-1px 0px #DDD,0px -1px #DDD,0px 1px #DDD';
      icon.style.paddingRight = '5px';
      icon.appendChild(document.createTextNode(checkSymbol));
      a.appendChild(document.createTextNode('Played'));
      li.appendChild(document.createTextNode(' - '));
      const link = li.appendChild(document.createElement('span'));
      const viewLink = link.appendChild(document.createElement('a'));
      viewLink.href = findUserProfileUrl() + '#listened-tab';
      viewLink.title = 'View list of played albums';
      viewLink.appendChild(document.createTextNode('view'));
    } else {
      button.title = 'Click to mark as played';
      button.addEventListener('click', onClickSetListened);
      try {
        icon.style.color = window.getComputedStyle(document.getElementById('pgBd')).backgroundColor;
        icon.style.textShadow = '1px 0px #959595,-1px 0px #959595,0px -1px #959595,0px 1px #959595';
        icon.style.paddingRight = '5px';
      } catch (e) {
        icon.style.color = '#959595';
        icon.style.fontWeight = 700;
      }
      icon.appendChild(document.createTextNode(checkSymbol));
      a.appendChild(document.createTextNode('Unplayed'));
    }
  }
  function makeListenedListTabLink() {
    const grid = document.getElementById('grids').appendChild(document.createElement('div'));
    grid.className = 'grid';
    grid.id = 'listened-grid';
    const inner = grid.appendChild(document.createElement('div'));
    inner.className = 'inner';
    inner.innerHTML = 'Loading...';
    const li = document.querySelector('ol#grid-tabs').appendChild(document.createElement('li'));
    li.id = 'listenedlisttablink';
    li.dataset.tab = 'listened';
    li.setAttribute('data-grid-id', 'listened-grid');
    const span = li.appendChild(document.createElement('span'));
    span.className = 'tab-title';
    span.appendChild(document.createTextNode('played'));
    const count = span.appendChild(document.createElement('span'));
    count.className = 'count';
    GM.getValue('myalbums', '{}').then(function myalbumsLoaded(str) {
      let n = 0;
      const myalbums = JSON.parse(str);
      for (const key in myalbums) {
        if (myalbums[key].listened) {
          n++;
        }
      }
      count.appendChild(document.createTextNode(n));
    });
    li.addEventListener('click', showListenedListTab);
    return li;
  }
  async function showListenedListTab() {
    if (document.getElementById('owner-controls')) document.getElementById('owner-controls').style.display = 'none';
    if (document.getElementById('wishlist-controls')) document.getElementById('wishlist-controls').style.display = 'none';
    const grid = document.getElementById('listened-grid');
    const gridActive = document.querySelector('#grids .grid.active');
    if (gridActive && gridActive !== grid) {
      gridActive.classList.remove('active');
    }
    grid.classList.add('active');
    const tabLink = document.getElementById('listenedlisttablink');
    const tabLinkActive = document.querySelector('#grid-tab li.active');
    if (tabLinkActive && tabLinkActive !== tabLink) {
      tabLinkActive.classList.remove('active');
    }
    tabLink.classList.add('active');
    if (grid.querySelector('.collection-items')) {
      return;
    }
    grid.innerHTML = '';
    const collectionItems = grid.appendChild(document.createElement('div'));
    collectionItems.className = 'collection-items';
    const collectionGrid = collectionItems.appendChild(document.createElement('ol'));
    collectionGrid.className = 'collection-grid';
    const myalbums = JSON.parse(await GM.getValue('myalbums', '{}'));
    for (const key in myalbums) {
      const albumData = myalbums[key];
      if (!albumData.listened) {
        continue;
      }
      const artist = albumData.artist || 'Unkown artist';
      const title = albumData.title || 'Unkown title';
      const albumCover = albumData.albumCover || 'https://bandcamp.com/img/0.gif';
      const url = key;
      const date = new Date(albumData.listened);
      const since = timeSince(date);
      const dateStr = dateFormater(date);
      let releaseDate;
      if ('releaseDate' in albumData) {
        releaseDate = dateFormaterRelease(new Date(albumData.releaseDate));
      } else {
        releaseDate = 'Unknown';
      }
      const li = collectionGrid.appendChild(document.createElement('li'));
      li.className = 'collection-item-container';
      li.innerHTML = `
      <div class="collection-item-gallery-container">
        <span class="bc-ui2 collect-item-icon-alt"></span>
        <div class="collection-item-art-container">
          <img class="collection-item-art" alt="" src="${albumCover}">
        </div>
        <div class="collection-title-details">
          <a target="_blank" href="https://${url}" class="item-link">
            <div class="collection-item-title">${title}</div>
            <div class="collection-item-artist">by ${artist}</div>
          </a>
        </div>
        <div class="collection-item-fav-track">
          <span title="${since} ago" class="favoriteTrackLabel">played</span>
          <div title="${since} ago">
            <span class="fav-track-link">${dateStr}</span>
          </div>
          <span class="favoriteTrackLabel">released</span>
          <div>
            <span class="fav-track-link">${releaseDate}</span>
          </div>
        </div>
      </div>
    `;
    }
  }
  function addVolumeBarToAlbumPage() {
    // Do not add if one of these scripts already added a volume bar
    // https://openuserjs.org/scripts/cuzi/Bandcamp_Volume_Bar
    // https://openuserjs.org/scripts/Mranth0ny62/Bandcamp_Volume_Bar
    // https://openuserjs.org/scripts/ArtificialInput/Bandcamp_Volume_Bar
    // https://greasyfork.org/en/scripts/11047-bandcamp-volume-bar/
    // https://greasyfork.org/en/scripts/38012-bandcamp-volume-bar/
    if (document.querySelector('.volumeControl')) {
      return false;
    }
    if (!document.querySelector('#trackInfoInner .playbutton')) {
      return;
    }
    addStyle(`
    /* Hide if inline_player is hidden */
    .hidden .volumeButton,.hidden .volumeControl,.hidden .volumeLabel{
      display:none
    }

    .volumeButton {
      display: inline-block;
      user-select:none;
      background: #fff;
      border: 1px solid #d9d9d9;
      border-radius: 2px;
      cursor: pointer;
      min-height: 50px;
      min-width: 54px;
      text-align:center;
      margin-top:5px;
    }

    .volumeSymbol {
      margin-top: 16px;
      font-size: 30px;
      color:#222;
      font-weight:bolder;
      transform: rotate(-90deg);
      text-shadow: rgb(255, 255, 255) 0px 0px 0px;
      transition: text-shadow linear 300ms;
    }
    .volumeControl {
      display:inline-block;
      user-select:none;
      top:5px;
    }
    .volumeLabel {
      display:inline-block;
    }

    .nextsongcontrolbutton {
      background:#fff;
      border:1px solid #d9d9d9;
      border-radius:2px;
      cursor:pointer;
      height:24px;
      width:35px;
      margin-top:2px;
      margin-left:80px;
      float:left;
      text-align:center
    }

    .nextsongcontrolicon {
      background-size:cover;
      background-image:${spriteRepeatShuffle};
      width:31px;
      height:20px;
      filter:drop-shadow(#FFF 1px 1px 2px);
      display:inline-block;
      margin-top:1px;
      transition: filter 500ms;
    }
    .nextsongcontrolbutton.active .nextsongcontrolicon {
      filter:drop-shadow(#0060F2 1px 1px 2px);
    }

  `);
    const playbutton = document.querySelector('#trackInfoInner .playbutton');
    const volumeButton = playbutton.cloneNode(true);
    document.querySelector('#trackInfoInner .inline_player').appendChild(volumeButton);
    volumeButton.classList.replace('playbutton', 'volumeButton');
    volumeButton.style.width = playbutton.clientWidth + 'px';
    const volumeSymbol = volumeButton.appendChild(document.createElement('div'));
    volumeSymbol.className = 'volumeSymbol';
    volumeSymbol.appendChild(document.createTextNode(CHROME ? '\uD83D\uDD5B' : '\u23F2'));
    const progbar = document.querySelector('#trackInfoInner .progbar_cell .progbar');
    const volumeBar = progbar.cloneNode(true);
    document.querySelector('#trackInfoInner .inline_player').appendChild(volumeBar);
    volumeBar.classList.add('volumeControl');
    volumeBar.style.width = Math.max(200, progbar.clientWidth) + 'px';
    const thumb = volumeBar.querySelector('.thumb');
    thumb.setAttribute('id', 'deluxe_thumb');
    const progbarFill = volumeBar.querySelector('.progbar_fill');
    const volumeLabel = document.createElement('div');
    document.querySelector('#trackInfoInner .inline_player').appendChild(volumeLabel);
    volumeLabel.classList.add('volumeLabel');
    let dragging = false;
    let dragPos;
    const width100 = volumeBar.clientWidth - (thumb.clientWidth + 2); // 2px border
    const rot0 = CHROME ? -180 : -90;
    const rot100 = CHROME ? 350 : 265 - rot0;
    const blue0 = 180;
    const blue100 = 75;
    const green0 = 90;
    const green100 = 100;
    const audioAlbumPage = document.querySelector('body>audio');
    addLogVolume(audioAlbumPage);
    const volumeBarPos = volumeBar.getBoundingClientRect().left;
    const displayVolume = function updateDisplayVolume() {
      const level = audioAlbumPage.logVolume;
      volumeLabel.innerHTML = parseInt(level * 100.0) + '%';
      thumb.style.left = width100 * level + 'px';
      progbarFill.style.width = parseInt(level * 100.0) + '%';
      volumeSymbol.style.transform = 'rotate(' + (level * rot100 + rot0) + 'deg)';
      if (level > 0.005) {
        volumeSymbol.style.textShadow = 'rgb(0, ' + (level * green100 + green0) + ', ' + (level * blue100 + blue0) + ') 0px 0px 4px';
        volumeSymbol.style.color = '#03a';
      } else {
        volumeSymbol.style.textShadow = 'rgb(255, 255, 255) 0px 0px 0px';
        volumeSymbol.style.color = '#222';
      }
    };
    thumb.addEventListener('mousedown', function thumbMouseDown(ev) {
      if (ev.button === 0) {
        dragging = true;
        dragPos = ev.offsetX;
      }
    });
    volumeBar.addEventListener('mouseup', function thumbMouseUp(ev) {
      if (ev.button !== 0) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      if (!dragging) {
        // Click on volume bar without dragging:
        audioAlbumPage.muted = false;
        audioAlbumPage.logVolume = Math.max(0.0, Math.min(1.0, (ev.pageX - volumeBarPos) / width100));
        displayVolume();
      }
      dragging = false;
      GM.setValue('volume', audioAlbumPage.logVolume);
    });
    document.addEventListener('mouseup', function documentMouseUp(ev) {
      if (ev.button === 0 && dragging) {
        dragging = false;
        ev.preventDefault();
        ev.stopPropagation();
        GM.setValue('volume', audioAlbumPage.logVolume);
      }
    });
    document.addEventListener('mousemove', function documentMouseMove(ev) {
      if (ev.button === 0 && dragging) {
        ev.preventDefault();
        ev.stopPropagation();
        audioAlbumPage.muted = false;
        audioAlbumPage.logVolume = Math.max(0.0, Math.min(1.0, (ev.pageX - volumeBarPos - dragPos) / width100));
        displayVolume();
      }
    });
    const onWheel = function onMouseWheel(ev) {
      ev.preventDefault();
      const direction = Math.min(Math.max(-1.0, ev.deltaY), 1.0);
      audioAlbumPage.logVolume = Math.min(Math.max(0.0, audioAlbumPage.logVolume - 0.05 * direction), 1.0);
      displayVolume();
      GM.setValue('volume', audioAlbumPage.logVolume);
    };
    volumeButton.addEventListener('wheel', onWheel, {
      passive: false
    });
    volumeBar.addEventListener('wheel', onWheel, {
      passive: false
    });
    volumeButton.addEventListener('click', function onVolumeButtonClick(ev) {
      if (audioAlbumPage.logVolume < 0.01) {
        if ('lastvolume' in audioAlbumPage.dataset && audioAlbumPage.dataset.lastvolume) {
          audioAlbumPage.logVolume = audioAlbumPage.dataset.lastvolume;
          GM.setValue('volume', audioAlbumPage.logVolume);
        } else {
          audioAlbumPage.logVolume = 1.0;
        }
      } else {
        audioAlbumPage.dataset.lastvolume = audioAlbumPage.logVolume;
        audioAlbumPage.logVolume = 0.0;
      }
      displayVolume();
    });
    displayVolume();
    window.clearInterval(ivRestoreVolume);

    // Repeat/shuffle buttons
    const playnextcontrols = document.querySelector('#trackInfoInner .inline_player').appendChild(document.createElement('div'));

    // Show repeat button
    const repeatButton = playnextcontrols.appendChild(document.createElement('div'));
    repeatButton.classList.add('nextsongcontrolbutton', 'repeat');
    repeatButton.setAttribute('title', 'Repeat');
    const repeatButtonIcon = repeatButton.appendChild(document.createElement('div'));
    repeatButtonIcon.classList.add('nextsongcontrolicon');
    repeatButton.dataset.repeat = 'none';
    repeatButtonIcon.style.backgroundPositionY = '-20px';
    repeatButton.addEventListener('click', function () {
      const posY = this.getElementsByClassName('nextsongcontrolicon')[0].style.backgroundPositionY;
      if (posY === '-20px') {
        this.getElementsByClassName('nextsongcontrolicon')[0].style.backgroundPositionY = '-40px';
        this.classList.toggle('active');
        this.dataset.repeat = 'one';
      } else if (posY === '-40px') {
        this.getElementsByClassName('nextsongcontrolicon')[0].style.backgroundPositionY = '-60px';
        this.dataset.repeat = 'all';
      } else {
        this.getElementsByClassName('nextsongcontrolicon')[0].style.backgroundPositionY = '-20px';
        this.classList.toggle('active');
        this.dataset.repeat = 'none';
      }
    });
    if (allFeatures.albumPageAutoRepeatAll.enabled) {
      repeatButton.click();
      repeatButton.click();
    }

    // Show shuffle button
    const shuffleButton = playnextcontrols.appendChild(document.createElement('div'));
    if (document.querySelectorAll('#track_table a div').length > 2) {
      shuffleButton.classList.add('nextsongcontrolbutton', 'shuffle');
      shuffleButton.setAttribute('title', 'Shuffle');
      const shuffleButtonIcon = shuffleButton.appendChild(document.createElement('div'));
      shuffleButtonIcon.classList.add('nextsongcontrolicon');
      shuffleButtonIcon.style.backgroundPositionY = '0px';
      shuffleButton.addEventListener('click', function () {
        this.classList.toggle('active');
      });
    }
    const findLastSongIndex = function () {
      const allDiv = document.querySelectorAll('#track_table a div');
      const nextDiv = document.querySelector('#track_table a div.playing');
      if (!nextDiv) {
        return allDiv.length - 1;
      }
      for (let i = 1; i < allDiv.length; i++) {
        if (allDiv[i] === nextDiv) {
          return i - 1;
        }
      }
      return -1;
    };
    const albumPageAudioOnEnded = function (ev) {
      const allDiv = document.querySelectorAll('#track_table a div');
      if (repeatButton.dataset.repeat === 'one') {
        // Click on last song again
        if (allDiv.length > 0) {
          allDiv[findLastSongIndex()].click();
        } else {
          // No tracklist, click on play button
          document.querySelector('#trackInfoInner .inline_player .playbutton').click();
        }
      } else if (shuffleButton.classList.contains('active') && allDiv.length > 1) {
        // Find last song
        const lastSongIndex = findLastSongIndex();
        // Set a random song (that is not the last song)
        let index = lastSongIndex;
        while (index === lastSongIndex) {
          index = randomIndex(allDiv.length);
        }
        if (index !== lastSongIndex + 1) {
          allDiv[index].click();
        }
      } else if (repeatButton.dataset.repeat === 'all') {
        if (findLastSongIndex() === allDiv.length - 1) {
          if (allDiv[0]) {
            allDiv[0].click(); // Click on first song's play button
          } else {
            // No tracklist, click on play button
            document.querySelector('#trackInfoInner .inline_player .playbutton').click();
          }
        }
      }
    };
    let lastMediaHubTitle = null;
    const onNotificationClick = function () {
      if (!document.querySelector('#trackInfoInner .inline_player .nextbutton').classList.contains('hiddenelem')) {
        document.querySelector('#trackInfoInner .inline_player .nextbutton').click();
      }
    };
    const updateChromePositionState = function () {
      if (audioAlbumPage && 'mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        navigator.mediaSession.setPositionState({
          duration: audioAlbumPage.duration || 180,
          playbackRate: audioAlbumPage.playbackRate,
          position: audioAlbumPage.currentTime
        });
      }
    };
    const albumPageUpdateMediaHubListener = function albumPageUpdateMediaHub() {
      const TralbumData = unsafeWindow.TralbumData;
      const title = document.querySelector('#trackInfoInner .inline_player .title').textContent.trim();
      if (lastMediaHubTitle === title) {
        return;
      }
      lastMediaHubTitle = title;

      // Notification
      if (allFeatures.nextSongNotifications.enabled && 'notification' in GM) {
        GM.notification({
          title: document.location.host,
          text: title + '\nby ' + TralbumData.artist + '\nfrom ' + TralbumData.current.title,
          image: `https://f4.bcbits.com/img/a${TralbumData.current.art_id}_2.jpg`,
          highlight: false,
          silent: true,
          timeout: NOTIFICATION_TIMEOUT,
          onclick: onNotificationClick
        });
      }

      // Media hub
      if ('mediaSession' in navigator) {
        if (audioAlbumPage) {
          navigator.mediaSession.playbackState = !audioAlbumPage.paused ? 'playing' : 'paused';
          updateChromePositionState();
        }

        // Pre load image to get dimension
        const cover = document.createElement('img');
        cover.onload = function onCoverLoaded() {
          navigator.mediaSession.metadata = new MediaMetadata({
            title,
            artist: TralbumData.artist,
            album: TralbumData.current.title,
            artwork: [{
              src: cover.src,
              sizes: `${cover.width}x${cover.height}`,
              type: 'image/jpeg'
            }]
          });
        };
        cover.src = `https://f4.bcbits.com/img/a${TralbumData.current.art_id}_2.jpg`;
        if (!document.querySelector('#trackInfoInner .inline_player .prevbutton').classList.contains('hiddenelem')) {
          navigator.mediaSession.setActionHandler('previoustrack', () => document.querySelector('#trackInfoInner .inline_player .prevbutton').click());
        } else {
          navigator.mediaSession.setActionHandler('previoustrack', null);
        }
        if (!document.querySelector('#trackInfoInner .inline_player .nextbutton').classList.contains('hiddenelem')) {
          navigator.mediaSession.setActionHandler('nexttrack', () => document.querySelector('#trackInfoInner .inline_player .nextbutton').click());
        } else {
          navigator.mediaSession.setActionHandler('nexttrack', null);
        }
        if (audioAlbumPage) {
          navigator.mediaSession.setActionHandler('play', function () {
            audioAlbumPage.play();
            navigator.mediaSession.playbackState = 'playing';
          });
          navigator.mediaSession.setActionHandler('pause', function () {
            audioAlbumPage.pause();
            navigator.mediaSession.playbackState = 'paused';
          });
          navigator.mediaSession.setActionHandler('seekbackward', function (event) {
            const skipTime = event.seekOffset || DEFAULTSKIPTIME;
            audioAlbumPage.currentTime = Math.max(audioAlbumPage.currentTime - skipTime, 0);
            updateChromePositionState();
          });
          navigator.mediaSession.setActionHandler('seekforward', function (event) {
            const skipTime = event.seekOffset || DEFAULTSKIPTIME;
            audioAlbumPage.currentTime = Math.min(audioAlbumPage.currentTime + skipTime, audioAlbumPage.duration);
            updateChromePositionState();
          });
          try {
            navigator.mediaSession.setActionHandler('stop', function () {
              audioAlbumPage.pause();
              audioAlbumPage.currentTime = 0;
              navigator.mediaSession.playbackState = 'paused';
            });
          } catch (error) {
            console.log('Warning! The "stop" media session action is not supported.');
          }
          try {
            navigator.mediaSession.setActionHandler('seekto', function (event) {
              if (event.fastSeek && 'fastSeek' in audioAlbumPage) {
                audioAlbumPage.fastSeek(event.seekTime);
                return;
              }
              audioAlbumPage.currentTime = event.seekTime;
              updateChromePositionState();
            });
          } catch (error) {
            console.log('Warning! The "seekto" media session action is not supported.');
          }
        }
      }
    };
    audioAlbumPage.addEventListener('ended', albumPageAudioOnEnded);
    audioAlbumPage.addEventListener('play', albumPageUpdateMediaHubListener);
    audioAlbumPage.addEventListener('ended', albumPageUpdateMediaHubListener);
  }
  function clickAddToWishlist() {
    const wishButton = document.querySelector('#collect-item>*');
    if (!wishButton) {
      window.setTimeout(clickAddToWishlist, 300);
      return;
    }
    wishButton.click();
    if (document.querySelector('#collection-main a')) {
      // if logged in, the click should be successful, so try to close the window
      window.setTimeout(window.close, 1000);
    }
  }
  function addReleaseDateButton() {
    const TralbumData = unsafeWindow.TralbumData;
    const now = new Date();
    const releaseDate = new Date(TralbumData.current.release_date);
    const days = parseInt(Math.ceil((releaseDate - now) / (1000 * 60 * 60 * 24)));
    if (releaseDate < now) {
      return; // Release date is in the past
    }

    const key = albumKey(TralbumData.url);
    addStyle(`
  .releaseReminderButton {
    font-size:13px;
    font-weight:700;
    cursor:pointer;
    transition: border 500ms, padding 500ms
  }
  .releaseReminderButton.active {
    border-radius:5px;
    padding:0px 5px;
    border:#3fb32f66 solid 2px
  }
  .releaseReminderButton:hover .releaseLabel {
    text-decoration:underline
  }
  `);
    const div = document.querySelector('.share-collect-controls').appendChild(document.createElement('div'));
    div.style = 'margin-top:4px';
    const span = div.appendChild(document.createElement('span'));
    span.className = 'custom-link-color releaseReminderButton';
    span.title = 'Releases ' + dateFormaterRelease(releaseDate);
    const daysStr = days === 1 ? 'tomorrow' : `in ${days} days`;
    span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Notify <time datetime="${releaseDate.toISOString()}">${daysStr}</time></span>`;
    span.addEventListener('click', ev => toggleReleaseReminder(ev, span));
    GM.getValue('releasereminder', '{}').then(function (str) {
      const releaseReminderData = JSON.parse(str);
      if (key in releaseReminderData) {
        span.classList.add('active');
        span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Reminder set (<time datetime="${releaseDate.toISOString()}">${daysStr}</time>)</span>`;
      }
    });
  }
  async function toggleReleaseReminder(ev, span) {
    const TralbumData = unsafeWindow.TralbumData;
    const key = albumKey(TralbumData.url);
    const releaseReminderData = JSON.parse(await GM.getValue('releasereminder', '{}'));
    if (key in releaseReminderData) {
      delete releaseReminderData[key];
    } else {
      releaseReminderData[key] = {
        albumCover: `https://f4.bcbits.com/img/a${TralbumData.art_id}_2.jpg`,
        releaseDate: TralbumData.current.release_date,
        artist: TralbumData.artist,
        title: TralbumData.current.title
      };
    }
    await GM.setValue('releasereminder', JSON.stringify(releaseReminderData));
    if (span) {
      const releaseDate = new Date(TralbumData.current.release_date);
      const now = new Date();
      const days = parseInt(Math.ceil((releaseDate - now) / (1000 * 60 * 60 * 24)));
      const daysStr = days === 1 ? 'tomorrow' : `in ${days} days`;
      if (key in releaseReminderData) {
        span.classList.add('active');
        span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Reminder set (<time datetime="${releaseDate.toISOString()}">${daysStr}</time>)</span>`;
      } else {
        span.classList.remove('active');
        span.innerHTML = `<span>\u23F0</span> <span class="releaseLabel">Notify <time datetime="${releaseDate.toISOString()}">${daysStr}</time></span>`;
      }
    }
  }
  async function removeReleaseReminder(ev) {
    ev.preventDefault();
    const key = this.parentNode.dataset.key;
    const releaseReminderData = JSON.parse(await GM.getValue('releasereminder', '{}'));
    if (key in releaseReminderData) {
      delete releaseReminderData[key];
      await GM.setValue('releasereminder', JSON.stringify(releaseReminderData));
    }
    this.parentNode.remove();
  }
  function maximizePastReleases() {
    document.getElementById('pastreleases').style.opacity = 0.0;
    window.setTimeout(() => showPastReleases(null, true), 500);
    document.getElementById('pastreleases').removeEventListener('click', maximizePastReleases);
  }
  async function showPastReleases(ev, forceShow) {
    let hideDate = await GM.getValue('pastreleaseshidden', false);
    const releaseReminderData = JSON.parse(await GM.getValue('releasereminder', '{}'));
    const releases = [];
    let pastReleasesCounter = 0;
    const now = new Date();
    now.setHours(23);
    now.setMinutes(59);
    for (const key in releaseReminderData) {
      releaseReminderData[key].key = key;
      releaseReminderData[key].date = new Date(releaseReminderData[key].releaseDate);
      releaseReminderData[key].past = now >= releaseReminderData[key].date;
      if (releaseReminderData[key].past) {
        pastReleasesCounter++;
      }
      releases.push(releaseReminderData[key]);
    }
    releases.sort((a, b) => b.date - a.date);
    if (releases.length === 0 || pastReleasesCounter === 0) {
      return;
    }
    if (!document.getElementById('pastreleases')) {
      addStyle(pastreleasesCSS);
    }
    const div = document.body.appendChild(document.getElementById('pastreleases') || document.createElement('div'));
    div.setAttribute('id', 'pastreleases');
    div.style.maxHeight = document.documentElement.clientHeight - 50 + 'px';
    div.style.maxWidth = document.documentElement.clientWidth - 100 + 'px';
    if (document.getElementById('discographyplayer') && !allFeatures.discographyplayerSidebar.enabled) {
      div.style.bottom = document.getElementById('discographyplayer').clientHeight + 10 + 'px';
    }
    window.setTimeout(function () {
      div.style.opacity = 1.0;
    }, 200);
    div.innerHTML = '';
    const table = div.appendChild(document.createElement('div'));
    table.classList.add('tablediv');
    const firstRow = table.appendChild(document.createElement('div'));
    firstRow.classList.add('header');
    firstRow.appendChild(document.createTextNode('\u23F0'));
    firstRow.appendChild(document.createElement('span'));
    if (!forceShow && hideDate && !isNaN(hideDate = new Date(hideDate)) && new Date() - hideDate < 1000 * 60 * 60) {
      firstRow.appendChild(document.createTextNode(`${pastReleasesCounter} release` + (pastReleasesCounter === 1 ? '' : 's')));
      table.addEventListener('click', maximizePastReleases);
      return;
    } else {
      GM.setValue('pastreleaseshidden', '');
    }
    const upcoming = firstRow.appendChild(document.createElement('span'));
    if (releases.length !== pastReleasesCounter) {
      upcoming.appendChild(document.createTextNode(' Show upcoming'));
      upcoming.classList.add('upcoming');
      upcoming.addEventListener('click', function () {
        document.querySelectorAll('#pastreleases .future').forEach(function (el) {
          el.style.display = 'table-row';
        });
        this.remove();
      });
    }
    const controls = firstRow.appendChild(document.createElement('span'));
    controls.classList.add('controls');
    const refresh = controls.appendChild(document.createElement('span'));
    refresh.setAttribute('title', 'Update');
    refresh.addEventListener('click', function () {
      document.getElementById('pastreleases').style.opacity = 0.0;
      window.setTimeout(() => showPastReleases(null, true), 1200);
    });
    refresh.appendChild(document.createTextNode(NOEMOJI ? 'Refresh' : '⟳'));
    const close = controls.appendChild(document.createElement('span'));
    close.setAttribute('title', 'Hide');
    close.addEventListener('click', function () {
      GM.setValue('pastreleaseshidden', new Date().toJSON());
      document.getElementById('pastreleases').style.opacity = 0.0;
      window.setTimeout(function () {
        document.getElementById('pastreleases').remove();
      }, 700);
    });
    close.appendChild(document.createTextNode('X'));
    releases.forEach(function (release) {
      const days = parseInt(Math.ceil((release.date - now) / (1000 * 60 * 60 * 24)));
      const daysStr = days === 1 ? 'tomorrow' : `in ${days} days`;
      let title = `${release.artist} - ${release.title}`;
      const entry = table.appendChild(document.createElement('a'));
      entry.setAttribute('title', title);
      entry.dataset.key = release.key;
      entry.classList.add('entry');
      entry.classList.add(release.past ? 'past' : 'future');
      entry.setAttribute('href', document.location.protocol + '//' + release.key);
      entry.setAttribute('target', '_blank');
      const removeButton = entry.appendChild(document.createElement('span'));
      removeButton.setAttribute('title', 'Remove album');
      removeButton.classList.add('remove');
      removeButton.appendChild(document.createTextNode(NOEMOJI ? 'X' : '╳'));
      removeButton.addEventListener('click', removeReleaseReminder);
      const time = entry.appendChild(document.createElement('time'));
      time.setAttribute('datetime', release.date.toISOString());
      time.setAttribute('title', 'Releases ' + dateFormaterRelease(release.date));
      if (release.past) {
        time.appendChild(document.createTextNode(dateFormaterNumeric(release.date)));
      } else {
        time.appendChild(document.createTextNode(daysStr));
      }
      const span = entry.appendChild(document.createElement('span'));
      span.classList.add('title');
      title = title.length < 60 ? title : title.substr(0, 57) + '…';
      span.appendChild(document.createTextNode(' ' + title));
      const image = entry.appendChild(document.createElement('div'));
      image.classList.add('image');
      image.style.backgroundRepeat = 'no-repeat';
      image.style.backgroundSize = 'contain';
      image.style.backgroundImage = `url(${release.albumCover})`;
    });
  }
  function showTagSearchForm() {
    const menuA = document.querySelector('#bcsde_tagsearchbutton');
    menuA.style.display = 'none';
    if (!document.getElementById('bcsde_tagsearchform')) {
      addStyle(`
    #bcsde_tagsearchform {
      margin:0px 7px;
    }
    #bcsde_tagsearchform_tags {
      display: inline-block;
      list-style: none;
      padding: 0;
    }
    #bcsde_tagsearchform_tags li {
      display:inline;
      background:#f2eaea8a;
      border: 1px solid rgb(225, 45, 5);
      border-radius: 15px;
      padding: 2px 10px 2px 2px;
      font-size: 13px;
      font-weight: 500;
    }
    #bcsde_tagsearchform_tags li svg {
      filter: invert(100%);
      fill:rgb(225, 45, 5);
      vertical-align: middle;
    }
    #bcsde_tagsearchform_tags li .checkmark-icon {
      display:inline-block;
    }
    #bcsde_tagsearchform_tags li .close-icon {
      display:none;
    }
    #bcsde_tagsearchform_tags li:hover .checkmark-icon {
      display:none;
    }
    #bcsde_tagsearchform_tags li:hover .close-icon {
      display:inline-block;
    }
    #bcsde_tagsearchform button {
      margin: 3px;
      color: black !important;
    }
    #bcsde_tagsearchform_input {
      background-color: #DFDFDF;
      padding: 10px 30px 10px 10px;
      font-size: 14px;
      border: none;
      width: 150px;
      color: #333;
      margin: 6px 0;
      border-radius: 3px;
      box-sizing: border-box;
      input-select:auto;
      -webkit-user-select:auto;
    }
    #bcsde_tagsearchform_suggestions {
      list-style: none;
      margin: 0;
      position: absolute;
      z-index: 10;
      background: #FFF;
      visibility: hidden;
      border: 1px solid #000;
      font-weight: normal;
      padding: 8px 0;
      opacity:0;
      transition:visibility 200ms linear,opacity 200ms linear;
      ${darkModeModeCurrent === true ? 'filter: invert(85%);' : ''}
    }
    #bcsde_tagsearchform_suggestions.visible {
      visibility:visible;
      opacity:1;
    }
    #bcsde_tagsearchform_suggestions li {
      padding: 8px 10px;
      cursor: pointer;
      list-style: none;
      margin: 0;
      display: list-item;
      text-align: left;
    }
    #bcsde_tagsearchform_suggestions li:hover,#bcsde_tagsearchform_suggestions li:focus {
      background: #F3F3F3;
    }
    `);
      const div = document.createElement('div');
      div.setAttribute('id', 'bcsde_tagsearchform');
      menuA.parentNode.appendChild(div);
      const tagsHolder = div.appendChild(document.createElement('ul'));
      tagsHolder.setAttribute('id', 'bcsde_tagsearchform_tags');
      const m = document.location.href.match(/\/tag\/([A-Za-z0-9-]+)(\?tab=all_releases&t=(.+))?/); // https://bandcamp.com/tag/metal?tab=all_releases&t=post-punk%2Cdark
      const tags = [];
      if (m) {
        tags.push(m[1]);
        if (m[3]) {
          tags.push(...m[3].split('&')[0].split('#')[0].split('%2C'));
        }
      }
      tags.forEach(tag => {
        tagsHolder.appendChild(tagSearchLabel(tag, tag.replace('-', ' ')));
      });
      const button = div.appendChild(document.createElement('button'));
      button.appendChild(document.createTextNode('Go'));
      button.addEventListener('click', openTagSearch);
      const input = div.appendChild(document.createElement('input'));
      input.setAttribute('type', 'text');
      input.setAttribute('id', 'bcsde_tagsearchform_input');
      input.setAttribute('placeholder', 'tag search');
      input.addEventListener('keyup', tagSearchInputChange);
      const suggestions = div.appendChild(document.createElement('ol'));
      suggestions.setAttribute('id', 'bcsde_tagsearchform_suggestions');
      if (document.querySelector('#corphome-autocomplete-form ul.hd-nav.corp-nav .log-in-link')) {
        // Homepage and not logged in -> make some room by removing the other list items from the nav
        document.querySelectorAll('#corphome-autocomplete-form ul.hd-nav.corp-nav>li:not([class~="menubar-item-tag-search"])').forEach(listItem => listItem.remove());
      }
    } else {
      document.querySelector('#bcsde_tagsearchform').style.display = '';
    }
  }
  function tagSearchLabel(tagNormName, tagName) {
    const li = document.createElement('li');
    li.dataset.tagNormName = tagNormName;
    li.dataset.name = tagName;
    const remove = li.appendChild(document.createElement('span'));
    remove.addEventListener('click', function () {
      this.parentNode.remove();
    });
    remove.innerHTML = `
  <svg class="checkmark-icon" width="16" height="16" viewBox="0 0 24 24">
    <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#material-done"></use>
  </svg>
  <svg class="close-icon" width="16" height="16" viewBox="0 0 24 24">
    <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#material-close"></use>
  </svg>
  `;
    li.appendChild(document.createTextNode(tagName));
    return li;
  }
  let ivTagSearchInput = null;
  function tagSearchInputChange(ev) {
    clearInterval(ivTagSearchInput);
    if (ev.key === 'Enter') {
      const input = document.getElementById('bcsde_tagsearchform_input');
      if (input.value) {
        useTagSuggestion(null, input.value);
        return;
      }
    }
    ivTagSearchInput = window.setTimeout(showTagSuggestions, 300);
  }
  function showTagSuggestions() {
    const input = document.getElementById('bcsde_tagsearchform_input');
    const suggestions = document.getElementById('bcsde_tagsearchform_suggestions');
    if (!input.value.trim()) {
      suggestions.classList.remove('visible');
      return;
    }
    getTagSuggestions(input.value).then(data => {
      let found = false;
      if (data.ok && 'matching_tags' in data) {
        suggestions.innerHTML = '';
        suggestions.classList.add('visible');
        suggestions.style.left = input.offsetLeft + 'px';
        data.matching_tags.forEach(result => {
          found = true;
          const li = suggestions.appendChild(document.createElement('li'));
          li.dataset.tagNormName = result.tag_norm_name;
          li.dataset.name = result.tag_name;
          li.addEventListener('click', useTagSuggestion);
          li.appendChild(document.createTextNode(result.tag_name));
        });
      }
      if (!found) {
        if (input.value.trim()) {
          const li = suggestions.appendChild(document.createElement('li'));
          li.dataset.tagNormName = input.value.replace(/\s+/, '-');
          li.dataset.name = input.value;
          li.addEventListener('click', useTagSuggestion);
          li.appendChild(document.createTextNode(input.value));
        } else {
          suggestions.classList.remove('visible');
        }
      }
    });
  }
  function useTagSuggestion(ev, str = null) {
    const suggestions = document.getElementById('bcsde_tagsearchform_suggestions');
    const tagsHolder = document.getElementById('bcsde_tagsearchform_tags');
    const input = document.getElementById('bcsde_tagsearchform_input');
    let tagNormName;
    let name;
    if (str) {
      // Use str
      tagNormName = str.replace(/\s+/, '-');
      name = str;
    } else {
      // Use tag that was clicked
      tagNormName = this.dataset.tagNormName;
      name = this.dataset.name;
    }
    tagsHolder.appendChild(tagSearchLabel(tagNormName, name));
    suggestions.classList.remove('visible');
    input.value = '';
    input.focus();
  }
  function getTagSuggestions(query) {
    const url = 'https://bandcamp.com/api/fansignup/1/search_tag';
    return new Promise(function getTagSuggestionsPromise(resolve, reject) {
      GM.xmlHttpRequest({
        method: 'POST',
        data: JSON.stringify({
          count: 20,
          search_term: query
        }),
        url,
        onload: function getTagSuggestionsOnLoad(response) {
          if (!response.responseText || response.responseText.indexOf('400 Bad Request') !== -1) {
            reject(new Error('Tag suggestions error: Too many cookies'));
            return;
          }
          if (!response.responseText || response.responseText.indexOf('429 Too Many Requests') !== -1) {
            reject(new Error('Tag suggestions error: 429 Too Many Requests'));
            return;
          }
          let result = null;
          try {
            result = JSON.parse(response.responseText);
          } catch (e) {
            console.debug(response.responseText);
            reject(e);
            return;
          }
          resolve(result);
        },
        onerror: function getTagSuggestionsOnError(response) {
          reject(new Error('error' in response ? response.error : 'getTagSuggestions failed with GM.xmlHttpRequest.onerror'));
        }
      });
    });
  }
  function openTagSearch() {
    // https://bandcamp.com/tag/metal?tab=all_releases&t=post-punk%2Cdark
    this.innerHTML = 'Loading...';
    const tagsHolder = document.getElementById('bcsde_tagsearchform_tags');
    const tags = [...new Set(Array.from(tagsHolder.querySelectorAll('li')).map(li => li.dataset.tagNormName))];
    if (!tags) {
      return;
    }
    const url = `https://bandcamp.com/tag/${tags.shift()}?tab=all_releases&t=${tags.join('%2C')}`;
    document.location.href = url;
  }
  function mainMenu(startBackup) {
    addStyle(`
    .deluxemenu {
      position:fixed;
      height:auto;
      overflow:auto;
      top:20px;
      left:20px;
      z-index:1102;
      padding:5px;
      transition: left 1s;
      border:2px solid black;
      border-radius:10px;
      color:black;
      background:white;
    }
    .deluxemenu input{
      box-shadow: 2px 2px 5px #5555;
      transition: box-shadow 500ms;
    }
    .deluxemenu fieldset{
      border: 1px solid #000a;
      border-radius: 4px;
      box-shadow: 1px 1px 3px #0005;
    }
    .deluxemenu fieldset legend{
      margin-left: 10px;
      color: #000a
    }
    .breathe {
      animation: breathe 1.5s linear infinite
    }
    @keyframes breathe {
      50% { opacity: 0.3 }
    }
    .errorblink {
      animation: errorblink 1.5s linear infinite;
      border: 2px solid red;
    }
    @keyframes errorblink {
      50% { border-color:#6a0c41 }
    }
    .deluxemenu ul {
      margin: 0px;
      padding: 0px 0px 0px 10px;
      list-style:disc;
    }
    .deluxemenu ul li{
      margin: 0px;
      padding: 0px;
    }
  `);
    if (startBackup === true) {
      exportMenu();
      return;
    }
    if (document.querySelector('.deluxemenu')) {
      return;
    }

    // Blur background
    if (document.getElementById('centerWrapper')) {
      document.getElementById('centerWrapper').style.filter = 'blur(4px)';
    }
    const main = document.body.appendChild(document.createElement('div'));
    main.className = 'deluxemenu';
    main.innerHTML = `<h2>${SCRIPT_NAME}</h2>
  Source code license: <a target="_blank" href="https://github.com/cvzi/Bandcamp-script-deluxe-edition/blob/master/LICENSE">MIT</a><br>
  Support: <a target="_blank" href="https://github.com/cvzi/Bandcamp-script-deluxe-edition">github.com/cvzi/Bandcamp-script-deluxe-edition</a><br>
  Dark theme based on: <a target="_blank" href="https://userstyles.org/styles/171538/bandcamp-in-dark">"Bandcamp In Dark"</a> by <a target="_blank" href="https://userstyles.org/users/563391">Simonus</a><br>
  Dev &amp; build tools used: <a target="_blank" href="https://github.com/cvzi/Bandcamp-script-deluxe-edition/blob/master/package.json#L43-L71">package.json</a><br>
  Emoji: <a target="_blank" href="https://github.com/hfg-gmuend/openmoji">OpenMoji</a><br>
  Javascript libraries used:<br><ul>
  <li><a target="_blank" href="https://json5.org/">JSON5 - JSON for Humans</a> (MIT license)</li>
  <li><a target="_blank" href="https://github.com/facebook/react">React</a> (MIT license)</li>
  <li><a target="_blank" href="https://github.com/cvzi/genius-lyrics-userscript/">GeniusLyrics.js</a> (GPLv3)</li>
   </ul>
   <h3>Options</h3>
  `;
    window.setTimeout(function moveMenuIntoView() {
      main.style.maxHeight = document.documentElement.clientHeight - 150 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px';
    }, 0);
    Promise.all([GM.getValue('volume', '0.7'), GM.getValue('myalbums', '{}'), GM.getValue('tralbumdata', '{}'), GM.getValue('enabledFeatures', false), GM.getValue('markasplayedThreshold', '10s')]).then(function allPromisesLoaded(values) {
      // let volume = parseFloat(values[0])
      // volume = Number.isNaN(volume) ? 0.7 : volume
      const myalbums = JSON.parse(values[1]);
      const tralbumdata = JSON.parse(values[2]);
      getEnabledFeatures(values[3]);
      const markasplayedThreshold = values[4];
      const checkboxOnChange = async function onCheckboxChange() {
        const input = this;
        getEnabledFeatures(await GM.getValue('enabledFeatures', false));
        allFeatures[input.name].enabled = input.checked;
        await GM.setValue('enabledFeatures', JSON.stringify(allFeatures));
        input.style.boxShadow = '2px 2px 5px #0a0f';
        window.setTimeout(function resetBoxShadowTimeout() {
          input.style.boxShadow = '';
        }, 3000);
        updateMoreVisibility();
      };
      const thresholdOnChange = async function onThresholdChange() {
        const input = this;
        let value = input.value.trim();
        const m = value.match(/^(\d+)(s|%)$/);
        if (m && parseInt(m[1]) >= 0 && (m[2] === 's' || parseInt(m[1]) <= 100)) {
          value = m[1] + m[2];
        } else if (value.match(/^\d+$/) && parseInt(value.split('\n')[0]) >= 0) {
          value = value.split('\n')[0] + 's';
        } else {
          window.alert('Format does not match!\nChoose either a time in seconds e.g. 10s or a percentage e.g. 50%');
          return;
        }
        await GM.setValue('markasplayedThreshold', value);
        input.value = value;
        input.style.boxShadow = '2px 2px 5px #0a0f';
        window.setTimeout(function resetBoxShadowTimeout() {
          input.style.boxShadow = '';
        }, 3000);
      };
      const updateMoreVisibility = function () {
        for (const feature in allFeatures) {
          if (document.getElementById('feature_' + feature + '_more_on')) {
            document.getElementById('feature_' + feature + '_more_on').style.display = allFeatures[feature].enabled ? 'block' : 'none';
          }
          if (document.getElementById('feature_' + feature + '_more_off')) {
            document.getElementById('feature_' + feature + '_more_off').style.display = allFeatures[feature].enabled ? 'none' : 'block';
          }
        }
      };
      for (const feature in allFeatures) {
        const div = main.appendChild(document.createElement('div'));
        const checkbox = div.appendChild(document.createElement('input'));
        checkbox.type = 'checkbox';
        checkbox.id = 'feature_' + feature;
        checkbox.name = feature;
        checkbox.checked = allFeatures[feature].enabled;
        const label = div.appendChild(document.createElement('label'));
        label.setAttribute('for', 'feature_' + feature);
        label.innerHTML = allFeatures[feature].name;
        checkbox.addEventListener('change', checkboxOnChange);
        if (feature === 'markasplayedAuto') {
          main.appendChild(document.createTextNode(' '));
          const inputThreshold = div.appendChild(document.createElement('input'));
          inputThreshold.type = 'text';
          inputThreshold.value = markasplayedThreshold;
          inputThreshold.size = 3;
          inputThreshold.title = 'For example: 10s or 50%';
          inputThreshold.id = 'feature_' + feature + '_threshold';
          div.appendChild(document.createTextNode(' '));
          const label = div.appendChild(document.createElement('label'));
          label.setAttribute('for', 'feature_' + feature + '_threshold');
          label.innerHTML = 'seconds or percentage.';
          inputThreshold.addEventListener('change', thresholdOnChange);
        }
        if (feature in moreSettings) {
          if (typeof moreSettings[feature] === 'function') {
            const moreSettinsContainer = main.appendChild(document.createElement('fieldset'));
            moreSettings[feature](moreSettinsContainer).then(function (v) {
              if (v) {
                moreSettinsContainer.appendChild(document.createElement('legend')).appendChild(document.createTextNode(v));
              }
            });
          } else {
            if ('true' in moreSettings[feature]) {
              const moreSettinsContainerOn = main.appendChild(document.createElement('fieldset'));
              moreSettinsContainerOn.setAttribute('id', 'feature_' + feature + '_more_on');
              moreSettinsContainerOn.style.display = allFeatures[feature].enabled ? 'block' : 'none';
              moreSettings[feature].true(moreSettinsContainerOn).then(function (v) {
                if (v) {
                  moreSettinsContainerOn.appendChild(document.createElement('legend')).appendChild(document.createTextNode(v));
                }
              });
            }
            if ('false' in moreSettings[feature]) {
              const moreSettinsContainerOff = main.appendChild(document.createElement('fieldset'));
              moreSettinsContainerOff.setAttribute('id', 'feature_' + feature + '_more_off');
              moreSettinsContainerOff.style.display = allFeatures[feature].enabled ? 'none' : 'block';
              moreSettings[feature].false(moreSettinsContainerOff).then(function (v) {
                if (v) {
                  moreSettinsContainerOff.appendChild(document.createElement('legend')).appendChild(document.createTextNode(v));
                }
              });
            }
          }
        }
      }

      // Hint
      main.appendChild(document.createElement('br'));
      const p = main.appendChild(document.createElement('p'));
      p.appendChild(document.createTextNode('Changes may require a page reload (F5)'));

      // Bottom buttons
      main.appendChild(document.createElement('br'));
      const buttons = main.appendChild(document.createElement('div'));
      const closeButton = buttons.appendChild(document.createElement('button'));
      closeButton.appendChild(document.createTextNode('Close'));
      closeButton.style.color = 'black';
      closeButton.addEventListener('click', function onCloseButtonClick() {
        document.querySelector('.deluxemenu').remove();
        // Un-blur background
        if (document.getElementById('centerWrapper')) {
          document.getElementById('centerWrapper').style.filter = '';
        }
      });
      const clearCacheButton = buttons.appendChild(document.createElement('button'));
      clearCacheButton.appendChild(document.createTextNode('Clear cache'));
      clearCacheButton.style.color = 'black';
      clearCacheButton.addEventListener('click', function onClearCacheButtonClick() {
        Promise.all([GM.setValue('genius_selectioncache', '{}'), GM.setValue('genius_requestcache', '{}'), GM.setValue('tralbumdata', '{}')]).then(function showClearedLabel() {
          clearCacheButton.innerHTML = 'Cleared';
        });
      });
      Promise.all([GM.getValue('genius_selectioncache', '{}'), GM.getValue('genius_requestcache', '{}')]).then(function (values) {
        JSON.stringify(tralbumdata);
        const bytesN = values[0].length - 2 + values[1].length - 2 + JSON.stringify(tralbumdata).length - 2;
        const bytes = metricPrefix(bytesN, 1, 1024) + 'Bytes';
        clearCacheButton.replaceChild(document.createTextNode('Clear cache (' + bytes + ')'), clearCacheButton.firstChild);
      });
      let myalbumsLength = 0;
      for (const key in myalbums) {
        if (myalbums[key].listened) {
          myalbumsLength++;
        }
      }
      const exportButton = buttons.appendChild(document.createElement('button'));
      exportButton.appendChild(document.createTextNode('Export played albums (' + myalbumsLength + ')'));
      exportButton.style.color = 'black';
      exportButton.addEventListener('click', function onExportButtonClick() {
        document.querySelector('.deluxemenu').remove();
        exportMenu();
      });
      main.appendChild(document.createElement('br'));
      main.appendChild(document.createElement('br'));
      const donateLink = main.appendChild(document.createElement('a'));
      const donateButton = donateLink.appendChild(document.createElement('button'));
      donateButton.appendChild(document.createTextNode('\u2764\uFE0F Donate & Support'));
      donateButton.style.color = '#e81224';
      donateLink.setAttribute('href', 'https://cvzi.github.io/.github/');
      donateLink.setAttribute('target', '_blank');
      main.appendChild(document.createElement('br'));
      main.appendChild(document.createElement('br'));
      const developerButton = main.appendChild(document.createElement('button'));
      developerButton.appendChild(document.createTextNode('Developer options'));
      developerButton.style.color = 'black';
      developerButton.addEventListener('click', function onDeveloperButtonClick() {
        document.querySelector('.deluxemenu').remove();
        developerMenu();
      });
    });
    window.setTimeout(function moveMenuIntoView() {
      let moveLeft = 0;
      main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      if (document.querySelector('#discographyplayer')) {
        if (document.querySelector('#discographyplayer').clientHeight < 100) {
          main.style.maxHeight = document.documentElement.clientHeight - 150 + 'px';
          main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
        } else if (document.querySelector('#discographyplayer').clientHeight > 300) {
          main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
          main.style.maxWidth = document.documentElement.clientWidth - 40 - document.querySelector('#discographyplayer').clientWidth + 'px';
          moveLeft = document.querySelector('#discographyplayer').clientWidth + 20;
        }
      }
      window.setTimeout(function () {
        main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth) - moveLeft) + 'px';
      }, 10);
    }, 10);
  }
  function developerMenu() {
    // Blur background
    if (document.getElementById('centerWrapper')) {
      document.getElementById('centerWrapper').style.filter = 'blur(4px)';
    }
    const main = document.body.appendChild(document.createElement('div'));
    main.className = 'deluxedeveloper deluxemenu';
    window.setTimeout(function moveMenuIntoView() {
      main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px';
    }, 0);
    const h2 = main.appendChild(document.createElement('h2'));
    h2.appendChild(document.createTextNode('Developer options'));
    const table = main.appendChild(document.createElement('table'));

    // Bottom buttons
    main.appendChild(document.createElement('br'));
    main.appendChild(document.createElement('br'));
    const buttons = main.appendChild(document.createElement('div'));
    const closeButton = buttons.appendChild(document.createElement('button'));
    closeButton.appendChild(document.createTextNode('Close'));
    closeButton.style.color = 'black';
    closeButton.addEventListener('click', function onCloseButtonClick() {
      document.querySelector('.deluxedeveloper').remove();
      // Un-blur background
      if (document.getElementById('centerWrapper')) {
        document.getElementById('centerWrapper').style.filter = '';
      }
    });
    let tr;
    let td;
    let input;
    GM.getValue('myalbums', '{}').then(function myalbumsLoaded(myalbumsStr) {
      const myalbums = JSON.parse(myalbumsStr);
      const listenedAlbums = [];
      for (const key in myalbums) {
        if (myalbums[key].listened) {
          listenedAlbums.push(myalbums[key]);
        }
      }
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"myalbums" listened records'));
      td = tr.appendChild(document.createElement('td'));
      input = td.appendChild(document.createElement('input'));
      input.type = 'text';
      input.value = listenedAlbums.length.toString();
      input.readOnly = true;
      input.style.width = '200px';
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"myalbums" string length'));
      td = tr.appendChild(document.createElement('td'));
      input = td.appendChild(document.createElement('input'));
      input.type = 'text';
      input.value = myalbumsStr.length.toString();
      input.readOnly = true;
      input.style.width = '200px';
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"myalbums" size'));
      td = tr.appendChild(document.createElement('td'));
      input = td.appendChild(document.createElement('input'));
      input.type = 'text';
      input.value = humanBytes(new Blob([myalbumsStr]).size);
      input.readOnly = true;
      input.style.width = '200px';
    });
    GM.getValue('tralbumdata', '{}').then(function tralbumdataLoaded(tralbumdataStr) {
      const tralbumdata = JSON.parse(tralbumdataStr);
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"tralbumdataStr" entries'));
      td = tr.appendChild(document.createElement('td'));
      input = td.appendChild(document.createElement('input'));
      input.type = 'text';
      input.value = Object.keys(tralbumdata).length.toString();
      input.readOnly = true;
      input.style.width = '200px';
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"tralbumdataStr" string length'));
      td = tr.appendChild(document.createElement('td'));
      input = td.appendChild(document.createElement('input'));
      input.type = 'text';
      input.value = tralbumdataStr.length.toString();
      input.readOnly = true;
      input.style.width = '200px';
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"tralbumdataStr" size'));
      td = tr.appendChild(document.createElement('td'));
      input = td.appendChild(document.createElement('input'));
      input.type = 'text';
      input.value = humanBytes(new Blob([tralbumdataStr]).size);
      input.readOnly = true;
      input.style.width = '200px';
    });
    try {
      GM.getValue('tralbumlibrary', '{}').then(function tralbumlibraryLoaded(tralbumlibraryStr) {
        const tralbumlibrary = JSON.parse(tralbumlibraryStr);
        tr = table.appendChild(document.createElement('tr'));
        td = tr.appendChild(document.createElement('td'));
        td.appendChild(document.createTextNode('"tralbumlibraryStr" entries'));
        td = tr.appendChild(document.createElement('td'));
        input = td.appendChild(document.createElement('input'));
        input.type = 'text';
        input.value = Object.keys(tralbumlibrary).length.toString();
        input.readOnly = true;
        input.style.width = '200px';
        console.log(3);
        tr = table.appendChild(document.createElement('tr'));
        td = tr.appendChild(document.createElement('td'));
        td.appendChild(document.createTextNode('"tralbumlibraryStr" string length'));
        td = tr.appendChild(document.createElement('td'));
        input = td.appendChild(document.createElement('input'));
        input.type = 'text';
        input.value = tralbumlibraryStr.length.toString();
        input.readOnly = true;
        input.style.width = '200px';
        tr = table.appendChild(document.createElement('tr'));
        td = tr.appendChild(document.createElement('td'));
        td.appendChild(document.createTextNode('"tralbumlibraryStr" size'));
        td = tr.appendChild(document.createElement('td'));
        input = td.appendChild(document.createElement('input'));
        input.type = 'text';
        input.value = humanBytes(new Blob([tralbumlibraryStr]).size);
        input.readOnly = true;
        input.style.width = '200px';
      });
    } catch (e) {
      tr = table.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('"tralbumlibraryStr"'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('Error: ' + e.toString()));
    }
    window.setTimeout(function moveMenuIntoView() {
      main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px';
    }, 500);
  }
  function exportMenu(showClearButton) {
    addStyle(`
    .deluxeexportmenu table {
    }

    .deluxeexportmenu table tr>td {
      color:black
    }
    .deluxeexportmenu table tr>td:nth-child(3) {
      color:silver
    }
    .deluxeexportmenu textarea.animated{
      box-shadow: 2px 2px 5px #5555;
      transition: box-shadow 500ms;
    }
    .deluxeexportmenu .drophint {
      position:absolute;
      top:10%;
      left:30%;
      color:#0097ff;
      font-size:3em;
      display:none;
    }
  `);

    // Blur background
    if (document.getElementById('centerWrapper')) {
      document.getElementById('centerWrapper').style.filter = 'blur(4px)';
    }
    const main = document.body.appendChild(document.createElement('div'));
    main.className = 'deluxeexportmenu deluxemenu';
    main.innerHTML = exportMenuHTML;
    const drophint = main.querySelector('.drophint');
    window.setTimeout(function moveMenuIntoView() {
      main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px';
    }, 0);
    GM.getValue('myalbums', '{}').then(function myalbumsLoaded(myalbumsStr) {
      const myalbums = JSON.parse(myalbumsStr);
      const listenedAlbums = [];
      for (const key in myalbums) {
        if (myalbums[key].listened) {
          listenedAlbums.push(myalbums[key]);
        }
      }
      main.querySelector('h2').appendChild(document.createTextNode(' (' + listenedAlbums.length + ' records)'));
      let format = '%artist% - %title%';
      const formatAlbum = function formatAlbumStr(format, myAlbum) {
        const releaseDate = new Date(myAlbum.releaseDate);
        const listenedDate = new Date(myAlbum.listened);
        const fields = {
          '%artist%': () => myAlbum.artist,
          '%title%': () => myAlbum.title,
          '%cover%': () => myAlbum.albumCover,
          '%url%': () => myAlbum.url,
          '%releaseDate%': () => releaseDate.toISOString(),
          '%listenedDate%': () => listenedDate.toISOString(),
          '%releaseUnix%': () => parseInt(releaseDate.getTime() / 1000),
          '%listenedUnix%': () => parseInt(listenedDate.getTime() / 1000),
          '%releaseTimestamp%': () => releaseDate.getTime(),
          '%listenedTimestamp%': () => listenedDate.getTime(),
          '%releaseY%': () => releaseDate.getFullYear().toString().substring(2),
          '%releaseYYYY%': () => releaseDate.getFullYear(),
          '%releaseM%': () => releaseDate.getMonth() + 1,
          '%releaseMM%': () => padd(releaseDate.getMonth() + 1, 2, '0'),
          '%releaseMon%': () => releaseDate.toLocaleString(undefined, {
            month: 'short'
          }),
          '%releaseMonth%': () => releaseDate.toLocaleString(undefined, {
            month: 'long'
          }),
          '%releaseD%': () => releaseDate.getDate(),
          '%releaseDD%': () => padd(releaseDate.getDate(), 2, '0'),
          '%releaseDay%': () => releaseDate.toLocaleString(undefined, {
            weekday: 'long'
          }),
          '%listenedY%': () => listenedDate.getFullYear().toString().substring(2),
          '%listenedYYYY%': () => listenedDate.getFullYear(),
          '%listenedM%': () => listenedDate.getMonth() + 1,
          '%listenedMM%': () => padd(listenedDate.getMonth() + 1, 2, '0'),
          '%listenedMon%': () => listenedDate.toLocaleString(undefined, {
            month: 'short'
          }),
          '%listenedMonth%': () => listenedDate.toLocaleString(undefined, {
            month: 'long'
          }),
          '%listenedD%': () => listenedDate.getDate(),
          '%listenedDD%': () => padd(listenedDate.getDate(), 2, '0'),
          '%listenedDay%': () => listenedDate.toLocaleString(undefined, {
            weekday: 'long'
          }),
          '%json%': () => JSON.stringify(myAlbum),
          '%json5%': () => JSON5.stringify(myAlbum)
        };
        for (const field in fields) {
          if (format.includes(field)) {
            try {
              format = format.replace(field, fields[field]());
            } catch (e) {
              console.log('Could not format replace "' + field + '": ' + e);
            }
          }
        }
        return format;
      };
      const sortBy = function sortByCmp(sortKey) {
        const cmps = {
          playedAsc: function playedAsc(a, b) {
            return -cmps.playedDesc(a, b);
          },
          playedDesc: function playedDesc(a, b) {
            try {
              return new Date(b.listened) - new Date(a.listened);
            } catch (e) {
              return 0;
            }
          },
          releasedAsc: function releasedAsc(a, b) {
            return -cmps.releasedDesc(a, b);
          },
          releasedDesc: function releasedDesc(a, b) {
            try {
              return new Date(b.releaseDate) - new Date(a.releaseDate);
            } catch (e) {
              return 0;
            }
          },
          artist: function artist(a, b, fallbackToTitle) {
            const d = a.artist.localeCompare(b.artist);
            if (d === 0 && fallbackToTitle) {
              return cmps.title(a, b, false);
            } else {
              return d;
            }
          },
          title: function title(a, b, fallbackToArtist) {
            const d = a.title.localeCompare(b.title);
            if (d === 0 && fallbackToArtist) {
              return cmps.artist(a, b, false);
            } else {
              return d;
            }
          }
        };
        listenedAlbums.sort(cmps[sortKey]);
      };
      const generate = function generateStr() {
        const textarea = document.getElementById('export_output');
        window.setTimeout(function generateStrAnimation() {
          textarea.classList.remove('animated');
          textarea.style.boxShadow = '2px 2px 5px #00af';
        }, 0);
        let str;
        if (format === '%backup%') {
          str = myalbumsStr;
        } else {
          const sortSelect = document.getElementById('sort_select');
          sortBy(sortSelect.options[sortSelect.selectedIndex].value);
          str = [];
          for (let i = 0; i < listenedAlbums.length; i++) {
            str.push(formatAlbum(format, listenedAlbums[i]));
          }
          str = str.join(navigator.platform.startsWith('Win') ? '\r\n' : '\n');
        }
        window.setTimeout(function generateStrAnimationSuccess() {
          textarea.value = str;
          textarea.classList.add('animated');
          textarea.style.boxShadow = '2px 2px 5px #0a0f';
        }, 50);
        window.setTimeout(function generateStrResetAnimation() {
          textarea.style.boxShadow = '';
        }, 3000);
        return str;
      };
      const inputFormatOnChange = async function onInputFormatChange() {
        const input = this;
        const formatExample = document.getElementById('format_example');
        format = input.value;
        formatExample.value = listenedAlbums.length > 0 ? formatAlbum(format, listenedAlbums[0]) : '';
        formatExample.style.boxShadow = '2px 2px 5px #0a0f';
        window.setTimeout(function resetBoxShadow() {
          formatExample.style.boxShadow = '';
        }, 3000);
      };
      const importData = function importDate(data) {
        GM.getValue('myalbums', '{}').then(function myalbumsLoaded(myalbumsStr) {
          let myalbums = JSON.parse(myalbumsStr);
          myalbums = Object.assign(myalbums, data);
          return GM.setValue('myalbums', JSON.stringify(myalbums));
        }).then(function myalbumsSaved() {
          document.getElementById('exportmenu_close').click();
          window.setTimeout(() => exportMenu(true), 50);
        });
      };
      const handleFiles = async function handleFilesAsync(fileList) {
        if (fileList.length === 0) {
          console.log('fileList is empty');
          return;
        }
        let data;
        try {
          data = await new Response(fileList[0]).json();
        } catch (e) {
          window.alert('Could not load file:\n' + e);
          return;
        }
        const n = Object.keys(data).length;
        if (window.confirm('Found ' + n + ' albums. Continue import and overwrite existing albums?')) {
          importData(data);
        }
      };
      const inputTable = main.appendChild(document.createElement('table'));
      let tr;
      let td;
      tr = inputTable.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      const label = td.appendChild(document.createElement('label'));
      label.setAttribute('for', 'export_format');
      label.appendChild(document.createTextNode('Format:'));
      td = tr.appendChild(document.createElement('td'));
      const inputFormat = td.appendChild(document.createElement('input'));
      inputFormat.type = 'text';
      inputFormat.value = format;
      inputFormat.id = 'export_format';
      inputFormat.style.width = '600px';
      inputFormat.addEventListener('change', inputFormatOnChange);
      inputFormat.addEventListener('keyup', inputFormatOnChange);
      tr = inputTable.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('Example:'));
      td = tr.appendChild(document.createElement('td'));
      const inputExample = td.appendChild(document.createElement('input'));
      inputExample.type = 'text';
      inputExample.value = listenedAlbums.length > 0 ? formatAlbum(format, listenedAlbums[0]) : '';
      inputExample.readOnly = true;
      inputExample.id = 'format_example';
      inputExample.style.width = '600px';
      td = tr.appendChild(document.createElement('td'));
      td.appendChild(document.createTextNode('Sort by:'));
      td = tr.appendChild(document.createElement('td'));
      const sortSelect = td.appendChild(document.createElement('select'));
      sortSelect.id = 'sort_select';
      sortSelect.innerHTML = `
      <option value="playedDesc">Recent play first</option>
      <option value="playedAsc">Recent play last</option>
      <option value="releasedDesc">Recent release first</option>
      <option value="releasedAsc">Recent release last</option>
      <option value="artist">Artist A-Z</option>
      <option value="title">Title A-Z</option>
    `;
      tr = inputTable.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.setAttribute('colspan', '2');
      const generateButton = td.appendChild(document.createElement('button'));
      generateButton.appendChild(document.createTextNode('Generate'));
      generateButton.addEventListener('click', ev => generate());
      const exportButton = td.appendChild(document.createElement('button'));
      exportButton.appendChild(document.createTextNode('Export to file'));
      exportButton.title = 'Download as a text file';
      exportButton.addEventListener('click', function onExportFileButtonClick() {
        const dateSuffix = new Date().toISOString().split('T')[0];
        document.getElementById('export_download_link').download = 'bandcampPlayedAlbums_' + dateSuffix + '.txt';
        document.getElementById('export_download_link').href = 'data:text/plain,' + encodeURIComponent(generate());
        window.setTimeout(() => document.getElementById('export_download_link').click(), 50);
      });
      const backupButton = td.appendChild(document.createElement('button'));
      backupButton.title = 'Backup to JSON file. Can be restored on another browser';
      backupButton.appendChild(document.createTextNode('Backup'));
      backupButton.addEventListener('click', function onBackupButtonClick() {
        format = '%backup%';
        document.getElementById('export_format').value = format;
        document.getElementById('format_example').value = 'JSON dictionary';
        const dateSuffix = new Date().toISOString().split('T')[0];
        document.getElementById('export_download_link').download = 'bandcampPlayedAlbums_' + dateSuffix + '.json';
        document.getElementById('export_download_link').href = 'data:application/json,' + encodeURIComponent(generate());
        document.getElementById('export_clear_button').style.display = '';
        GM.setValue('myalbums_lastbackup', Object.keys(myalbums).length + '#####' + new Date().toJSON());
        window.setTimeout(() => document.getElementById('export_download_link').click(), 50);
      });
      const restoreButton = td.appendChild(document.createElement('button'));
      restoreButton.title = 'Restore from JSON file backup';
      restoreButton.appendChild(document.createTextNode('Restore'));
      restoreButton.addEventListener('click', function onBackupButtonClick() {
        inputFile.click();
      });
      const clearButton = td.appendChild(document.createElement('button'));
      clearButton.appendChild(document.createTextNode('Clear played albums'));
      clearButton.id = 'export_clear_button';
      if (showClearButton !== true) {
        clearButton.style.display = 'none';
      }
      clearButton.addEventListener('click', function onClearButtonClick() {
        if (window.confirm('Remove all played albums?\n\nThis cannot be undone.')) {
          if (window.confirm('Are you sure? Delete all played albums?')) {
            GM.setValue('myalbums', '{}').then(function myalbumsSaved() {
              document.getElementById('exportmenu_close').click();
              window.setTimeout(exportMenu, 50);
            });
          }
        }
      });
      const downloadA = td.appendChild(document.createElement('a'));
      downloadA.id = 'export_download_link';
      downloadA.href = '#';
      downloadA.download = 'bandcamp_played_albums.txt';
      downloadA.target = '_blank';
      const inputFile = td.appendChild(document.createElement('input'));
      inputFile.type = 'file';
      inputFile.id = 'input_file';
      inputFile.accept = '.txt,plain/text,.json,application/json';
      inputFile.style.display = 'none';
      inputFile.addEventListener('change', function onFileChanged(ev) {
        handleFiles(this.files);
      }, false);
      main.addEventListener('dragenter', function dragenter(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        main.style.backgroundColor = '#c6daf9';
        drophint.style.left = main.clientWidth / 2 - drophint.clientWidth / 2 + 'px';
        drophint.style.display = 'block';
      }, false);
      main.addEventListener('dragleave', function dragleave(ev) {
        main.style.backgroundColor = 'white';
        drophint.style.display = 'none';
      }, false);
      main.addEventListener('dragover', function dragover(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        main.style.backgroundColor = '#c6daf9';
        drophint.style.display = 'block';
      }, false);
      main.addEventListener('drop', function drop(ev) {
        ev.stopPropagation();
        ev.preventDefault();
        main.style.backgroundColor = 'white';
        drophint.style.display = 'none';
        handleFiles(ev.dataTransfer.files);
      }, false);
      tr = inputTable.appendChild(document.createElement('tr'));
      td = tr.appendChild(document.createElement('td'));
      td.setAttribute('colspan', '3');
      const textarea = td.appendChild(document.createElement('textarea'));
      textarea.id = 'export_output';
      textarea.style.width = Math.max(500, main.clientWidth - 50) + 'px';

      // Bottom buttons
      main.appendChild(document.createElement('br'));
      main.appendChild(document.createElement('br'));
      const buttons = main.appendChild(document.createElement('div'));
      const closeButton = buttons.appendChild(document.createElement('button'));
      closeButton.appendChild(document.createTextNode('Close'));
      closeButton.id = 'exportmenu_close';
      closeButton.style.color = 'black';
      closeButton.addEventListener('click', function onCloseButtonClick() {
        document.querySelector('.deluxeexportmenu').remove();
        // Un-blur background
        if (document.getElementById('centerWrapper')) {
          document.getElementById('centerWrapper').style.filter = '';
        }
      });
    });
    window.setTimeout(function moveMenuIntoView() {
      main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      main.style.left = Math.max(20, 0.5 * (document.body.clientWidth - main.clientWidth)) + 'px';
    }, 0);
  }
  function checkBackupStatus() {
    GM.getValue('myalbums_lastbackup', '').then(function myalbumsLastBackupLoaded(value) {
      if (!value || !value.includes('#####')) {
        // Set current date (install date) as initial value
        GM.setValue('myalbums_lastbackup', '0#####' + new Date().toJSON());
        return;
      }
      const parts = value.split('#####');
      const n0 = parseInt(parts[0]);
      const lastBackup = new Date(parts[1]);
      if (new Date() - lastBackup > BACKUP_REMINDER_DAYS * 86400000) {
        GM.getValue('myalbums', '{}').then(function myalbumsLoaded(str) {
          const n1 = Object.keys(JSON.parse(str)).length;
          if (Math.abs(n0 - n1) > 10) {
            showBackupHint(lastBackup, Math.abs(n0 - n1));
          }
        });
      }
    });
  }
  function showBackupHint(lastBackup, changedRecords) {
    const since = timeSince(lastBackup);
    addStyle(`
    .backupreminder {
      position:fixed;
      height:auto;
      overflow:auto;
      top:110%;
      left:40%;
      z-index:200;
      padding:5px;
      transition: top 1s;
      border:2px solid black;
      border-radius:10px;
      color:black;
      background:white;
    }
  `);

    // Blur background
    if (document.getElementById('centerWrapper')) {
      document.getElementById('centerWrapper').style.filter = 'blur(4px)';
    }
    const main = document.body.appendChild(document.createElement('div'));
    main.className = 'backupreminder';
    main.innerHTML = `<h2>${SCRIPT_NAME}</h2>
  <h1>Backup reminder</h1>
  <p>
    Your last backup was ${since} ago. Since then, you played ${changedRecords} albums.
  </p>
  `;
    main.appendChild(document.createElement('br'));
    const buttons = main.appendChild(document.createElement('div'));
    const closeButton = buttons.appendChild(document.createElement('button'));
    closeButton.appendChild(document.createTextNode('Close'));
    closeButton.id = 'backupreminder_close';
    closeButton.style.color = 'black';
    closeButton.addEventListener('click', function onCloseButtonClick() {
      document.querySelector('.backupreminder').remove();
      // Un-blur background
      if (document.getElementById('centerWrapper')) {
        document.getElementById('centerWrapper').style.filter = '';
      }
    });
    buttons.appendChild(document.createTextNode(' '));
    const backupButton = buttons.appendChild(document.createElement('button'));
    backupButton.appendChild(document.createTextNode('Start backup'));
    backupButton.style.color = '#0687f5';
    backupButton.addEventListener('click', function backupButtonClick() {
      document.getElementById('backupreminder_close').click();
      mainMenu(true);
    });
    buttons.appendChild(document.createTextNode(' '));
    const ignoreButton = buttons.appendChild(document.createElement('button'));
    ignoreButton.appendChild(document.createTextNode('Disable reminder'));
    ignoreButton.style.color = 'black';
    ignoreButton.addEventListener('click', async function ignoreButtonClick() {
      getEnabledFeatures(await GM.getValue('enabledFeatures', false));
      if (allFeatures.backupReminder.enabled) {
        allFeatures.backupReminder.enabled = false;
      }
      await GM.setValue('enabledFeatures', JSON.stringify(allFeatures));
      document.getElementById('backupreminder_close').click();
    });
    window.setTimeout(function moveMenuIntoView() {
      main.style.maxHeight = document.documentElement.clientHeight - 40 + 'px';
      main.style.maxWidth = document.documentElement.clientWidth - 40 + 'px';
      main.style.left = Math.max(20, 0.5 * (document.documentElement.clientWidth - main.clientWidth)) + 'px';
      main.style.top = Math.max(20, 0.3 * document.documentElement.clientHeight) + 'px';
    }, 0);
  }
  function downloadMp3FromLink(ev, a, addSpinner, removeSpinner, noGM) {
    const url = a.href;
    if (GM_download && !noGM) {
      // Use Tampermonkey GM_download function
      console.log('Using GM_download function');
      ev.preventDefault();
      addSpinner(a);
      let GMdownloadStatus = 0;
      GM_download({
        url,
        name: a.download || 'default.mp3',
        onerror: function downloadMp3FromLinkOnError(e) {
          console.log('GM_download onerror:', e);
          window.setTimeout(function () {
            if (GMdownloadStatus !== 1) {
              if (url.startsWith('data')) {
                console.log('GM_download failed with data url');
                document.location.href = url;
              } else {
                console.log('Trying again with GM_download disabled');
                downloadMp3FromLink(ev, a, addSpinner, removeSpinner, true);
              }
            }
          }, 1000);
        },
        ontimeout: function downloadMp3FromLinkOnTimeout() {
          window.alert('Could not download via GM_download. Time out.');
          document.location.href = url;
        },
        onload: function downloadMp3FromLinkOnLoad() {
          console.log('Successfully downloaded via GM_download');
          GMdownloadStatus = 1;
          window.setTimeout(() => removeSpinner(a), 500);
        }
      });
      return;
    }
    if (!url.startsWith('http') || navigator.userAgent.indexOf('Chrome') !== -1) {
      // Just open the link normally (no prevent default)
      addSpinner(a);
      window.setTimeout(() => removeSpinner(a), 1000);
      return;
    }

    // Use GM.xmlHttpRequest to download and offer data uri
    ev.preventDefault();
    console.log('Using GM.xmlHttpRequest to download and then offer data uri');
    addSpinner(a);
    GM.xmlHttpRequest({
      method: 'GET',
      overrideMimeType: 'text/plain; charset=x-user-defined',
      url,
      onload: function onMp3Load(response) {
        console.log('Successfully received data via GM.xmlHttpRequest, starting download');
        a.href = 'data:audio/mpeg;base64,' + base64encode(response.responseText);
        window.setTimeout(() => a.click(), 10);
      },
      onerror: function onMp3LoadError(response) {
        window.alert('Could not download via GM.xmlHttpRequest');
        document.location.href = url;
      }
    });
  }
  function addDownloadLinksToAlbumPage() {
    addStyle(`
  .download-col .downloaddisk:hover {
    text-decoration:none
  }
  /* From http://www.designcouch.com/home/why/2013/05/23/dead-simple-pure-css-loading-spinner/ */
  .downspinner {
    height:16px;
    width:16px;
    margin:0px auto;
    position:relative;
    display:inline-block;
    animation: spinnerrotation 3s infinite linear;
    cursor:wait;
  }
  @keyframes spinnerrotation {
    from {transform: rotate(0deg)}
    to {transform: rotate(359deg)}
  }`);
    const addSpiner = function downloadLinksOnAlbumPageAddSpinner(el) {
      el.style = '';
      el.classList.add('downspinner');
    };
    const removeSpinner = function downloadLinksOnAlbumPageRemoveSpinner(el) {
      el.classList.remove('downspinner');
      el.style = 'background:#1cea1c; border-radius:5px; padding:1px; opacity:0.5';
    };
    const TralbumData = unsafeWindow.TralbumData;
    if (TralbumData && TralbumData.hasAudio && !TralbumData.freeDownloadPage && TralbumData.trackinfo) {
      const hoverdiv = document.querySelectorAll('.download-col div');
      if (hoverdiv.length > 0) {
        // Album page
        for (let i = 0; i < TralbumData.trackinfo.length; i++) {
          if (!NOEMOJI && hoverdiv[i].querySelector('a[href*="?action=download"]')) {
            // Replace buy link with shopping cart emoji
            hoverdiv[i].querySelector('a[href*="?action=download"]').innerHTML = '&#x1f6d2;';
            hoverdiv[i].querySelector('a[href*="?action=download"]').title = 'buy track';
          }
          // Add download link
          const t = TralbumData.trackinfo[i];
          if (!t.file) {
            continue;
          }
          const prop = Object.keys(t.file)[0]; // Just use the first file entry
          const mp3 = t.file[prop].replace(/^\/\//, 'http://');
          const a = document.createElement('a');
          a.className = 'downloaddisk';
          a.href = mp3;
          a.download = (t.track_num == null ? '' : (t.track_num > 9 ? '' : '0') + t.track_num + '. ') + fixFilename(TralbumData.artist + ' - ' + t.title) + '.mp3';
          a.title = 'Download ' + prop;
          a.appendChild(document.createTextNode(NOEMOJI ? '\u2193' : '\uD83D\uDCBE'));
          a.addEventListener('click', function onDownloadLinkClick(ev) {
            downloadMp3FromLink(ev, this, addSpiner, removeSpinner);
          });
          hoverdiv[i].appendChild(a);
        }
      } else if (document.querySelector('#trackInfo .download-link')) {
        // Single track page
        const t = TralbumData.trackinfo[0];
        if (!t.file) {
          return;
        }
        const prop = Object.keys(t.file)[0];
        const mp3 = t.file[prop].replace(/^\/\//, 'http://');
        const a = document.createElement('a');
        a.className = 'downloaddisk';
        a.href = mp3;
        a.download = (t.track_num == null ? '' : (t.track_num > 9 ? '' : '0') + t.track_num + '. ') + fixFilename(TralbumData.artist + ' - ' + t.title) + '.mp3';
        a.title = 'Download ' + prop;
        a.appendChild(document.createTextNode(NOEMOJI ? '\u2193' : '\uD83D\uDCBE'));
        a.addEventListener('click', function onDownloadLinkClick(ev) {
          downloadMp3FromLink(ev, this, addSpiner, removeSpinner);
        });
        document.querySelector('#trackInfo .download-link').parentNode.appendChild(a);
      }
    }
  }
  function addOpenDiscographyPlayerFromAlbumPage() {
    // Open discrography player by clicking on top right corner of album art
    // Shows the usual play button on hover
    const xRatio = 0.7;
    const yRatio = 0.3;
    let rect = null;
    const isInRatio = function isInRatio(ev) {
      rect = rect || ev.target.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const y = ev.clientY - rect.top;
      return x > rect.width * xRatio && y < rect.height * yRatio;
    };
    const a = document.querySelector('#tralbumArt a.popupImage');
    if (!a) {
      return;
    }
    const div = a.appendChild(document.createElement('div'));
    div.classList.add('art-play');
    div.innerHTML = '<div class="art-play-bg"></div><div class="art-play-icon"></div>';
    a.classList.add('playFromAlbumPage');
    addStyle(`
  .playFromAlbumPage .art-play {
    position: absolute;
    width: 74px;
    height: 54px;
    right: 7%;
    top: 15%;
    margin-left: -36px;
    margin-top: -27px;
    opacity: 0.0;
    transition: opacity 0.2s;
  }
  .playFromAlbumPage .art-play-bg {
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0;
    top: 0;
    background: #000;
    border-radius: 4px;
  }
  .playFromAlbumPage .art-play-icon {
    position: absolute;
    width: 0;
    height: 0;
    left: 28px;
    top: 17px;
    border-width: 10px 0 10px 17px;
    border-color: transparent transparent transparent #fff;
    border-style: dashed dashed dashed solid;
  }
  `);
    a.addEventListener('click', function onAlbumArtClick(ev) {
      if (isInRatio(ev)) {
        // Open player
        ev.preventDefault();
        ev.stopPropagation();
        if (unsafeWindow.TralbumData) {
          addAlbumToPlaylist(unsafeWindow.TralbumData);
        } else {
          playAlbumFromUrl(document.location.href);
        }
      }
    }, true);
    a.addEventListener('mouseover', function onAlbumArtOver(ev) {
      if (isInRatio(ev)) {
        a.querySelector('.art-play').style.opacity = 0.7;
      } else {
        a.querySelector('.art-play').style.opacity = 0.0;
      }
    });
    a.addEventListener('mousemove', function onAlbumArtOver(ev) {
      if (isInRatio(ev)) {
        a.querySelector('.art-play').style.opacity = 0.7;
      } else {
        a.querySelector('.art-play').style.opacity = 0.0;
      }
    });
    a.addEventListener('mouseleave', function onAlbumArtOver(ev) {
      rect = null;
      a.querySelector('.art-play').style.opacity = 0.0;
    });
  }
  function addLyricsToAlbumPage() {
    // Load lyrics from html into TralbumData
    const TralbumData = unsafeWindow.TralbumData;
    function findInTralbumData(url) {
      for (let i = 0; i < TralbumData.trackinfo.length; i++) {
        const t = TralbumData.trackinfo[i];
        if (url.endsWith(t.title_link)) {
          return t;
        }
      }
      return null;
    }
    const tracks = Array.from(document.querySelectorAll('#track_table .track_row_view .title a')).map(a => findInTralbumData(a.href));
    document.querySelectorAll('#track_table .track_row_view .title a').forEach(function (a) {
      const tr = parentQuery(a, 'tr[rel]');
      const trackNum = tr.getAttribute('rel').split('tracknum=')[1];
      const lyricsRow = document.querySelector('#track_table tr#lyrics_row_' + trackNum);
      const lyricsLink = tr.querySelector('.geniuslink');
      if (tr.querySelector('.info_link').innerHTML.indexOf('lyrics') === -1) {
        // Hide info link if there are no lyrics
        tr.querySelector('.info_link a[href*="/track/"]').innerHTML = '';
      }
      if (lyricsRow) {
        const trackNum = parseInt(lyricsRow.id.split('lyrics_row_')[1]);
        for (let i = 0; i < tracks.length; i++) {
          if (trackNum === tracks[i].track_num) {
            tracks[i].lyrics = lyricsRow.querySelector('div').textContent;
          }
        }
      } else if (!lyricsLink) {
        // Add genius link
        const lyricsLink = tr.querySelector('.info_link').appendChild(document.createElement('a'));
        lyricsLink.dataset.trackNum = trackNum;
        lyricsLink.title = 'load lyrics from genius.com';
        lyricsLink.href = '#geniuslyrics-' + trackNum;
        lyricsLink.classList.add('geniuslink');
        lyricsLink.appendChild(document.createTextNode('G'));
        lyricsLink.style = 'color: black;background: rgb(255, 255, 100);border-radius: 50%;padding: 0px 3px;border: 1px solid black';
        lyricsLink.addEventListener('click', function () {
          loadGeniusLyrics(parseInt(this.dataset.trackNum));
        });
      }
    });
  }
  let genius = null;
  let geniusContainerTr = null;
  let geniusTrackNum = -1;
  let geniusArtistsArr = [];
  let geniusTitle = '';
  function geniusGetCleanLyricsContainer() {
    geniusContainerTr.innerHTML = `
                    <td colspan="5">
                      <div></div>
                    </td>
`;
    return geniusContainerTr.querySelector('div');
  }
  function geniusAddLyrics(force, beLessSpecific) {
    genius.f.loadLyrics(force, beLessSpecific, geniusTitle, geniusArtistsArr, true);
  }
  function geniusHideLyrics() {
    document.querySelectorAll('.loadingspinner').forEach(spinner => spinner.remove());
    document.querySelectorAll('#track_table tr.showlyrics').forEach(e => e.classList.remove('showlyrics'));
  }
  function geniusSetFrameDimensions(container, iframe) {
    const width = iframe.style.width = '500px';
    const height = iframe.style.height = '650px';
    if (genius.option.themeKey === 'spotify') {
      iframe.style.backgroundColor = 'black';
    } else {
      iframe.style.backgroundColor = '';
    }
    return [width, height];
  }
  function geniusAddCss() {
    addStyle(geniusCSS);
    addStyle(`
  #myconfigwin39457845 {
    background-color:${darkModeModeCurrent === true ? '#a2a2a2' : 'white'} !important;
    color:${darkModeModeCurrent === true ? 'white' : 'black'} !important;
  }
  #myconfigwin39457845 div {
    background-color:${darkModeModeCurrent === true ? '#3E3E3E' : '#EFEFEF'} !important
  }
  .lyricsnavbar {
    background:${darkModeModeCurrent === true ? '#7d7c7c' : '#fafafa'} !important;
  }
  `);
  }
  function geniusCreateSpinner(spinnerHolder) {
    geniusContainerTr.querySelector('div').insertBefore(spinnerHolder, geniusContainerTr.querySelector('div').firstChild);
    const spinner = spinnerHolder.appendChild(document.createElement('div'));
    spinner.classList.add('loadingspinner');
    return spinner;
  }
  function geniusShowSearchField(query) {
    const b = geniusGetCleanLyricsContainer();
    b.style.border = '1px solid black';
    b.style.borderRadius = '3px';
    b.style.padding = '5px';
    b.appendChild(document.createTextNode('Search genius.com: '));
    b.style.paddingRight = '15px';
    const input = b.appendChild(document.createElement('input'));
    input.className = 'SearchInputBox__input';
    input.placeholder = 'Search genius.com...';
    input.style = 'width: 300px;background-color: #F3F3F3;padding: 10px 30px 10px 10px;font-size: 14px; border: none;color: #333;margin: 6px 0;height: 17px;border-radius: 3px;';
    const span = b.appendChild(document.createElement('span'));
    span.style = 'cursor:pointer; margin-left: -25px;';
    span.appendChild(document.createTextNode(' \uD83D\uDD0D'));
    if (query) {
      input.value = query;
    } else if (genius.current.artists) {
      input.value = genius.current.artists;
    }
    input.addEventListener('change', function onSearchLyricsButtonClick() {
      if (input.value) {
        genius.f.searchByQuery(input.value, b);
      }
    });
    input.addEventListener('keyup', function onSearchLyricsKeyUp(ev) {
      if (ev.keyCode === 13) {
        ev.preventDefault();
        if (input.value) {
          genius.f.searchByQuery(input.value, b);
        }
      }
    });
    span.addEventListener('click', function onSearchLyricsKeyUp(ev) {
      if (input.value) {
        genius.f.searchByQuery(input.value, b);
      }
    });
    input.focus();
  }
  function geniusListSongs(hits, container, query) {
    if (!container) {
      container = geniusGetCleanLyricsContainer();
    }

    // Back to search button
    const backToSearchButton = document.createElement('a');
    backToSearchButton.href = '#';
    backToSearchButton.appendChild(document.createTextNode('Back to search'));
    backToSearchButton.addEventListener('click', function backToSearchButtonClick(ev) {
      ev.preventDefault();
      if (query) {
        geniusShowSearchField(query);
      } else if (genius.current.artists) {
        geniusShowSearchField(genius.current.artists + ' ' + genius.current.title);
      } else {
        geniusShowSearchField();
      }
    });
    const separator = document.createElement('span');
    separator.setAttribute('class', 'second-line-separator');
    separator.setAttribute('style', 'padding:0px 3px');
    separator.appendChild(document.createTextNode('•'));

    // Hide button
    const hideButton = document.createElement('a');
    hideButton.href = '#';
    hideButton.appendChild(document.createTextNode('Hide'));
    hideButton.addEventListener('click', function hideButtonClick(ev) {
      ev.preventDefault();
      geniusHideLyrics();
    });

    // List search results
    const trackhtml = '<div style="float:left;"><div class="onhover" style="margin-top:-0.25em;display:none"><span style="color:black;font-size:2.0em">🅖</span></div><div class="onout"><span style="font-size:1.5em">📄</span></div></div>' + '<div style="float:left; margin-left:5px">$artist • $title <br><span style="font-size:0.7em">👁 $stats.pageviews $lyrics_state</span></div><div style="clear:left;"></div>';
    container.innerHTML = '<ol class="tracklist" style="font-size:1.15em"></ol>';
    container.classList.add('searchresultlist');
    if (darkModeModeCurrent === true) {
      container.style.backgroundColor = '#262626';
      container.style.position = 'relative';
    }
    container.insertBefore(hideButton, container.firstChild);
    container.insertBefore(separator, container.firstChild);
    container.insertBefore(backToSearchButton, container.firstChild);
    const ol = container.querySelector('ol');
    const searchresultsLengths = hits.length;
    const title = genius.current.title;
    const artists = genius.current.artists;
    const onclick = function onclick() {
      genius.f.rememberLyricsSelection(title, artists, this.dataset.hit);
      genius.f.showLyrics(JSON.parse(this.dataset.hit), searchresultsLengths);
    };
    const mouseover = function onmouseover() {
      this.querySelector('.onhover').style.display = 'block';
      this.querySelector('.onout').style.display = 'none';
      this.style.backgroundColor = darkModeModeCurrent === true ? 'rgb(70, 70, 70)' : 'rgb(200, 200, 200)';
    };
    const mouseout = function onmouseout() {
      this.querySelector('.onhover').style.display = 'none';
      this.querySelector('.onout').style.display = 'block';
      this.style.backgroundColor = darkModeModeCurrent === true ? '#262626' : 'rgb(255, 255, 255)';
    };
    hits.forEach(function forEachHit(hit) {
      const li = document.createElement('li');
      if (darkModeModeCurrent === true) {
        li.style.backgroundColor = '#262626';
      }
      li.style.cursor = 'pointer';
      li.style.transition = 'background-color 0.2s';
      li.style.padding = '3px';
      li.style.margin = '2px';
      li.style.borderRadius = '3px';
      li.innerHTML = trackhtml.replace(/\$title/g, hit.result.title_with_featured).replace(/\$artist/g, hit.result.primary_artist.name).replace(/\$lyrics_state/g, hit.result.lyrics_state).replace(/\$stats\.pageviews/g, genius.f.metricPrefix(hit.result.stats.pageviews, 1));
      li.dataset.hit = JSON.stringify(hit);
      li.addEventListener('click', onclick);
      li.addEventListener('mouseover', mouseover);
      li.addEventListener('mouseout', mouseout);
      ol.appendChild(li);
    });
  }
  function geniusOnLyricsReady(song, container) {
    container.parentNode.parentNode.dataset.loaded = 'loaded';
  }
  function geniusOnNoResults(songTitle, songArtistsArr) {
    geniusContainerTr.dataset.loaded = 'loaded';
    document.querySelectorAll('#track_table tr.showlyrics').forEach(e => e.classList.remove('showlyrics'));
    document.querySelector(`#track_table tr[rel="tracknum=${geniusTrackNum}"]`).classList.add('showlyrics');
    geniusShowSearchField(songArtistsArr.join(' ') + ' ' + songTitle);
  }
  let geniusAudio = null;
  let geniusLastPos = null;
  function geniusAudioTimeUpdate() {
    if (!geniusAudio) {
      geniusAudio = document.querySelector('body>audio[src]');
    }
    if (!geniusAudio) {
      return;
    }
    const pos = geniusAudio.currentTime / geniusAudio.duration;
    if (pos >= 0 && `${geniusLastPos}` !== `${pos}`) {
      geniusLastPos = pos;
      genius.f.scrollLyrics(pos);
    }
  }
  function initGenius() {
    if (!genius) {
      genius = geniusLyrics({
        GM: {
          xmlHttpRequest: GM.xmlHttpRequest,
          getValue: (name, defaultValue) => GM.getValue('genius_' + name, defaultValue),
          setValue: (name, value) => GM.setValue('genius_' + name, value)
        },
        scriptName: SCRIPT_NAME,
        scriptIssuesURL: 'https://github.com/cvzi/Bandcamp-script-deluxe-edition/issues',
        scriptIssuesTitle: 'Report problem: github.com/cvzi/Bandcamp-script-deluxe-edition/issues',
        domain: document.location.origin + '/',
        emptyURL: document.location.origin + LYRICS_EMPTY_PATH,
        addCss: geniusAddCss,
        listSongs: geniusListSongs,
        showSearchField: geniusShowSearchField,
        addLyrics: geniusAddLyrics,
        hideLyrics: geniusHideLyrics,
        getCleanLyricsContainer: geniusGetCleanLyricsContainer,
        setFrameDimensions: geniusSetFrameDimensions,
        createSpinner: geniusCreateSpinner,
        onLyricsReady: geniusOnLyricsReady,
        onNoResults: geniusOnNoResults
      });
      document.addEventListener('timeupdate', geniusAudioTimeUpdate, true);
    }
  }
  function loadGeniusLyrics(trackNum) {
    // Toggle lyrics
    geniusContainerTr = document.getElementById('lyrics_row_' + trackNum);
    let tr;
    if (geniusContainerTr) {
      tr = document.querySelector(`#track_table tr[rel="tracknum=${trackNum}"]`);
      if ('loaded' in geniusContainerTr.dataset && geniusContainerTr.dataset.loaded === 'loaded') {
        if (tr.classList.contains('showlyrics')) {
          // Hide lyrics if already loaded
          document.querySelectorAll('#track_table tr.showlyrics').forEach(e => e.classList.remove('showlyrics'));
        } else {
          // Show lyrics again
          document.querySelectorAll('#track_table tr.showlyrics').forEach(e => e.classList.remove('showlyrics'));
          tr.classList.add('showlyrics');
        }
        return;
      } else if (geniusTrackNum === trackNum) {
        // Lyrics currently loading
        console.log('loadGeniusLyrics already loading trackNum=' + trackNum);
        return;
      }
    }
    geniusTrackNum = trackNum;
    if (!geniusContainerTr) {
      geniusContainerTr = document.createElement('tr');
      geniusContainerTr.className = 'lyricsRow';
      geniusContainerTr.setAttribute('id', 'lyrics_row_' + trackNum);
      tr = document.querySelector(`#track_table tr[rel="tracknum=${trackNum}"]`);
      if (tr.nextElementSibling) {
        tr.parentNode.insertBefore(geniusContainerTr, tr.nextElementSibling);
      } else {
        tr.parentNode.appendChild(geniusContainerTr);
      }
      document.querySelectorAll('#track_table tr.showlyrics').forEach(e => e.classList.remove('showlyrics'));
      tr.classList.add('showlyrics');
      const spinnerHolder = geniusContainerTr.appendChild(document.createElement('div'));
      spinnerHolder.classList.add('loadingspinnerholder');
      const spinner = spinnerHolder.appendChild(document.createElement('div'));
      spinner.classList.add('loadingspinner');
    }
    initGenius();
    const track = unsafeWindow.TralbumData.trackinfo.find(t => t.track_num === trackNum);
    geniusTitle = track.title;
    geniusArtistsArr = unsafeWindow.TralbumData.artist.split(/&|,|ft\.?|feat\.?/).map(s => s.trim());
    geniusAddLyrics();
  }
  let explorer = null;
  async function showExplorer() {
    if (explorer) {
      explorer.style.display = 'block';
      return explorer;
    }
    document.title = 'Explorer';
    document.body.innerHTML = '';
    explorer = document.body.appendChild(document.createElement('div'));
    explorer.setAttribute('id', 'expRoot');
    addStyle(`
#expRoot {
  background:white;
  color:black
}
#expRoot .albumListItem{
  cursor:pointer;
  background:#ddd;
  display: flex;
  align-items: center;
  justify-content: center;
}
#expRoot .albumListItemOdd{
  background:#eee
}
#expRoot .albumListItem:hover{
  background:greenyellow
}

#expRoot .albumListItem.selected{
  background:#aaa;
}

  `);
    new Explorer(document.getElementById('expRoot'), {
      playAlbumFromUrl,
      deletePermanentTralbum
    }).render();
  }
  function appendMainMenuButtonTo(ul) {
    addStyle(`
    .menubar-item .menubar-symbol {
      display:flex;
      font-size:24px !important;
      transition:transform 1s ease-out
    }
    .menubar-item .menubar-symbol:hover {
      text-decoration:none
    }
    .menubar-item:hover .menubar-symbol-settings {
      transform:rotate(1turn)
    }
    .menubar-item:hover .menubar-symbol-library {
      transform:scale(-1, 1)
    }
    .menubar-item:hover .menubar-symbol-tag-search {
      transform:scale(1.3)
    }
  `);
    const liSettings = ul.insertBefore(document.createElement('li'), ul.firstChild);
    liSettings.className = 'menubar-item hoverable';
    liSettings.title = 'userscript settings - ' + SCRIPT_NAME;
    const aSettings = liSettings.appendChild(document.createElement('a'));
    aSettings.className = 'menubar-symbol menubar-symbol-settings';
    aSettings.href = '#';
    if (NOEMOJI) {
      const img = aSettings.appendChild(document.createElement('img'));
      img.style = 'display:inline; width:34px; vertical-align:middle;';
      img.src = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/72x72/2699.png';
    } else {
      aSettings.appendChild(document.createTextNode('\u2699\uFE0F'));
    }
    liSettings.addEventListener('click', () => mainMenu());
    if (allFeatures.keepLibrary.enabled) {
      const liExplorer = ul.insertBefore(document.createElement('li'), ul.firstChild);
      liExplorer.className = 'menubar-item hoverable';
      liExplorer.title = 'library - ' + SCRIPT_NAME;
      const aExplorer = liExplorer.appendChild(document.createElement('a'));
      aExplorer.className = 'menubar-symbol menubar-symbol-library';
      aExplorer.href = PLAYER_URL;
      if (NOEMOJI) {
        const img = aExplorer.appendChild(document.createElement('img'));
        img.style = 'display:inline; width:34px; vertical-align:middle;';
        img.src = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/72x72/1F5C3.png';
      } else {
        aExplorer.appendChild(document.createTextNode('\uD83D\uDDC3\uFE0F'));
      }
      aExplorer.target = '_blank';
      // TODO open library in frame
      // liExplorer.addEventListener('click', function (ev) {
      // ev.preventDefault()
      //   openExplorer()
      // })
    }

    const liSearch = ul.insertBefore(document.createElement('li'), ul.firstChild);
    liSearch.className = 'menubar-item hoverable menubar-item-tag-search';
    liSearch.title = 'tag search - ' + SCRIPT_NAME;
    const aSearch = liSearch.appendChild(document.createElement('a'));
    aSearch.className = 'menubar-symbol menubar-symbol-tag-search';
    aSearch.href = '#';
    if (NOEMOJI) {
      aSearch.innerHTML = `
    <svg width="22" height="22" viewBox="0 0 15 16" class="svg-icon" style="border: 2px solid #000000c4;border-radius: 30%;padding: 3px;">
        <use xlink:href="#menubar-search-input-icon">
    </svg>`;
    } else {
      aSearch.appendChild(document.createTextNode('\uD83D\uDD0D'));
    }
    aSearch.setAttribute('id', 'bcsde_tagsearchbutton');
    aSearch.addEventListener('click', showTagSearchForm);
  }
  function appendMainMenuButtonLeftTo(leftOf) {
    // Wait for the design to load images
    window.setTimeout(() => {
      const rect = leftOf.getBoundingClientRect();
      console.log(rect);
      const ul = document.createElement('ul');
      ul.className = 'bcsde_settingsbar';
      appendMainMenuButtonTo(document.body.appendChild(ul));
      addStyle(`
    .bcsde_settingsbar {position:absolute; top:-15px; left:${rect.right}px; list-style-type: none; padding:0; margin:0; opacity:0.6; transition:top 300ms}
    .bcsde_settingsbar:hover {top:${rect.top}px}
    .bcsde_settingsbar a:hover {text-decoration:none}
    .bcsde_settingsbar li {float:left; padding:0; margin:0}`);
      window.addEventListener('resize', function () {
        ul.style.left = leftOf.getBoundingClientRect().right + 'px';
      });
    }, 500);
  }
  function humour() {
    if (document.getElementById('salesfeed')) {
      const salesfeedHumour = {};
      salesfeedHumour.all = [`${SCRIPT_NAME} by cuzi, Dark theme by Simonus`, `Provide feedback for ${SCRIPT_NAME} on openuser.js or github.com`, `${SCRIPT_NAME} - “nobody pays for software anymore” 🙌🏽`];
      salesfeedHumour.chosen = salesfeedHumour.all[0];
      unsafeWindow.$('#pagedata').data('blob').salesfeed_humour = salesfeedHumour;
    }
  }
  function showAlbumID() {
    if (unsafeWindow.TralbumData && 'id' in unsafeWindow.TralbumData && document.querySelector('#name-section h3')) {
      document.querySelectorAll('#name-section h3').forEach(function (h3) {
        const id = unsafeWindow.TralbumData.id;
        const h4 = h3.parentNode.appendChild(document.createElement('h4'));
        h4.style.fontSize = '13px';
        h4.style.fontWeight = 'normal';
        h4.style.opacity = 0.6;
        h4.style.marginTop = '4px';
        h4.innerHTML = `Album ID: <span style="user-select: all;">${id}</span>`;
        h4.addEventListener('click', function () {
          GM_setClipboard(id.toString());
          const span = h4.appendChild(document.createElement('span'));
          span.innerHTML = ' copied!';
          span.style.marginLeft = '5px';
          span.style.transition = 'opacity 2s';
          span.style.opacity = 1;
          window.setInterval(() => span.style.opacity = 0, 0);
          window.setInterval(() => span.remove(), 1000);
        });
      });
    }
  }
  function formatReleaseDateOnAlbumPage() {
    const textContainers = document.querySelectorAll('.tralbumData');
    if (textContainers.length === 0) {
      return;
    }
    GM.getValue('custom_release_date_format_str').then(function customFormatReleaseDate(format) {
      if (!format || !format.trim()) {
        console.warn('formatReleaseDateOnAlbumPage: No custom release date format string set.');
        return;
      }
      textContainers.forEach(function (textContainer) {
        for (const match of textContainer.innerHTML.matchAll(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/gim)) {
          const epochMs = Date.parse(match[0]);
          if (Number.isNaN(epochMs)) {
            console.warn(`formatReleaseDateOnAlbumPage: Could not parse date string "${match[0].trim()}"`);
            continue;
          }
          const date = new Date(epochMs);
          textContainer.innerHTML = textContainer.innerHTML.replace(match[0], `${customDateFormatter(format, date)}`);
        }
      });
    });
  }
  function showDownloadLinkOnAlbumPage() {
    if (!document.querySelector('a[href*="purchases?from=menubar"]')) {
      return;
    }
    const purchasesUrl = document.querySelector('a[href*="purchases?from=menubar"]').href;
    const itemUrl = document.location.href.split('#')[0];
    GM.xmlHttpRequest({
      method: 'GET',
      url: purchasesUrl,
      onload: function loadPurchases(response) {
        const doc = new window.DOMParser().parseFromString(response.responseText, 'text/html').documentElement;
        for (const purchasesItem of Array.from(doc.querySelectorAll('.purchases-item'))) {
          if (!purchasesItem.querySelector('.purchases-item-title[href]')) {
            continue;
          }
          const url = purchasesItem.querySelector('.purchases-item-title[href]').href;
          if (url !== itemUrl) {
            continue;
          }
          const downloadLink = purchasesItem.querySelector('.purchases-item-download a[href]');
          if (!downloadLink && !downloadLink.href) {
            continue;
          }
          const purchasedMsgA = document.querySelector('#purchased-msg a');
          purchasedMsgA.href = downloadLink.href;
          purchasedMsgA.textContent = 'Download';
          return;
        }

        // TODO if no match was found, load the next batch of download links, see https://github.com/cvzi/Bandcamp-script-deluxe-edition/issues/288
      },

      onerror: function loadPurchasesError(response) {
        console.log('showDownloadLinkOnAlbumPage() in onerror() Error: ' + response.status + '\nResponse:\n' + response.responseText + '\n' + ('error' in response ? response.error : ''));
      }
    });
  }
  function feedShowOnlyNewReleases() {
    const stories = document.querySelectorAll('#stories li.story');
    if (stories.length < 0) {
      window.setTimeout(feedShowOnlyNewReleases, 10000);
      return;
    }
    if (Array.from(stories).reduce((accumulator, story) => {
      // Remove stories that are not 'nr' => new releases
      if (!story.classList.contains('nr')) {
        story.remove();
        accumulator++;
      }
      return accumulator;
    }, 0)) {
      // If any were removed, trigger a reload of the feed
      window.scrollBy(0, 1);
      window.scrollBy(0, -1);
      window.setTimeout(feedShowOnlyNewReleases, 500);
    } else {
      window.setTimeout(feedShowOnlyNewReleases, 1500);
    }
  }
  function feedShowAudioControls() {
    const makeAudioVisible = function () {
      this.removeEventListener('timeupdate', makeAudioVisible);
      this.controls = true;
      this.loop = true;
      this.style = `
      width: 20%;
      min-width: 200px;
      height: 40px;
      position: fixed;
      right: 0px;
      bottom: 0px;
      display: block;
      opacity: 1;`;
    };
    const audio = document.querySelector('body>audio');
    if (audio) {
      audio.addEventListener('timeupdate', makeAudioVisible);
    }
  }
  function darkMode() {
    // CSS taken from https://userstyles.org/styles/171538/bandcamp-in-dark by Simonus (Version from January 24, 2020)
    // https://userstyles.org/api/v1/styles/css/171538

    let propOpenWrapperBackgroundColor = '#2626268f';
    try {
      const brightnessStr = window.localStorage.getItem('bcsde_bgimage_brightness');
      if (brightnessStr !== null && brightnessStr !== 'null') {
        const brightness = parseFloat(brightnessStr);
        const alpha = (brightness - 50) / 255;
        propOpenWrapperBackgroundColor = `rgba(0, 0, 0, ${alpha})`;
      }
    } catch (e) {
      console.log('Could not access window.localStorage: ' + e);
    }
    addStyle(`
:root {
  --pgBdColor: #262626;
  --propOpenWrapperBackgroundColor: ${propOpenWrapperBackgroundColor}
}`);
    addStyle(darkmodeCSS);
    window.setTimeout(humour, 3000);
    darkModeInjected = true;
  }
  async function darkModeOnLoad() {
    const yes = await darkModeMode();
    if (!yes) {
      return;
    }

    // Load body's background image and detect if it is light or dark and adapt it's transparency
    const backgroudImageCSS = window.getComputedStyle(document.body).backgroundImage;
    let imageURL = backgroudImageCSS.match(/["'](.*)["']/);
    let shouldUpdate = false;
    let hasBackgroundImage = false;
    if (imageURL && imageURL[1]) {
      imageURL = imageURL[1];
      shouldUpdate = true;
      hasBackgroundImage = true;
      try {
        const editTime = parseInt(window.localStorage.getItem('bcsde_bgimage_brightness_time'));
        if (Date.now() - editTime < 604800000) {
          shouldUpdate = false;
        }
      } catch (e) {
        console.log('Could not read from window.localStorage: ' + e);
      }
    }
    if (shouldUpdate) {
      const canvas = await loadCrossSiteImage(imageURL);
      const ctx = canvas.getContext('2d');
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let sum = 0.0;
      let div = 0;
      const stepSize = canvas.width * canvas.height / 1000;
      const len = data.length - 4;
      for (let i = 0; i < len; i += 4 * parseInt(stepSize * Math.random())) {
        const v = Math.max(Math.max(data[i], data[i + 1]), data[i + 2]);
        sum += v;
        div++;
      }
      const brightness = sum / div;
      const alpha = (brightness - 50) / 255;
      document.querySelector('#propOpenWrapper').style.backgroundColor = `rgba(0, 0, 0, ${alpha})`;
      console.log(`Brightness updated: ${brightness}, alpha: ${alpha}`);
      try {
        window.localStorage.setItem('bcsde_bgimage_brightness', brightness);
        window.localStorage.setItem('bcsde_bgimage_brightness_time', Date.now());
      } catch (e) {
        console.log('Could not write to window.localStorage: ' + e);
      }
    }
    if (!hasBackgroundImage) {
      // No background image, check background color
      const color = window.getComputedStyle(document.body).backgroundColor;
      if (color) {
        const m = color.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
        if (m) {
          const [, r, g, b] = m;
          if (r < 70 && g < 70 && b < 70) {
            addStyle(`
            :root {
              --propOpenWrapperBackgroundColor: rgb(${r}, ${g}, ${b})
            }
          `);
          }
        }
      }
    }
    // pgBd background color
    if (document.getElementById('custom-design-rules-style')) {
      const customCss = document.getElementById('custom-design-rules-style').textContent;
      if (customCss.indexOf('#pgBd') !== -1) {
        const pgBdStyle = customCss.split('#pgBd')[1].split('}')[0];
        const m = pgBdStyle.match(/background(-color)?\s*:\s*(.+?)[;\s]/m);
        if (m && m.length > 2 && m[2]) {
          const color = css2rgb(m[2]);
          if (color) {
            const [r, g, b] = color;
            if (r < 70 && g < 70 && b < 70) {
              addStyle(`
              :root {
                --pgBdColor: rgb(${r}, ${g}, ${b});
              }
            `);
            }
          }
        }
      }
    }
  }
  async function updateSuntimes() {
    const value = await GM.getValue('darkmode', '1');
    if (value.startsWith('3#')) {
      const data = JSON.parse(value.substring(2));
      const sunData = suntimes(new Date(), data.latitude, data.longitude);
      const newValue = '3#' + JSON.stringify(Object.assign(data, sunData));
      if (newValue !== value) {
        await GM.setValue('darkmode', newValue);
      }
    }
  }
  function confirmDomain() {
    return new Promise(function confirmDomainPromise(resolve) {
      GM.getValue('domains', '{}').then(function (v) {
        const domains = JSON.parse(v);
        if (document.location.hostname in domains) {
          const isBandcamp = domains[document.location.hostname];
          return resolve(isBandcamp);
        } else {
          window.setTimeout(function () {
            const isBandcamp = window.confirm(`${SCRIPT_NAME}

This page looks like a bandcamp page, but the URL ${document.location.hostname} is not a bandcamp URL.

Do you want to run the userscript on this page?

If this is a malicious website, running the userscript may leak personal data (e.g. played albums) to the website`);
            domains[document.location.hostname] = isBandcamp;
            GM.setValue('domains', JSON.stringify(domains)).then(() => resolve(isBandcamp));
          }, 3000);
        }
      });
    });
  }
  async function setDomain(enabled) {
    const domains = JSON.parse(await GM.getValue('domains', '{}'));
    domains[document.location.hostname] = enabled;
    await GM.setValue('domains', JSON.stringify(domains));
  }
  let darkModeModeCurrent = null;
  async function darkModeMode() {
    if (darkModeModeCurrent != null) {
      return darkModeModeCurrent;
    }
    const value = await GM.getValue('darkmode', '1');
    darkModeModeCurrent = false;
    if (value.startsWith('1')) {
      darkModeModeCurrent = true;
    } else if (value.startsWith('2#')) {
      darkModeModeCurrent = nowInTimeRange(value.substring(2));
    } else if (value.startsWith('3#')) {
      const data = JSON.parse(value.substring(2));
      window.setTimeout(updateSuntimes, Math.random() * 10000);
      darkModeModeCurrent = nowInBetween(new Date(data.sunset), new Date(data.sunrise));
    }
    return darkModeModeCurrent;
  }
  function start() {
    // Load settings and enable darkmode
    return new Promise(function startFct(resolve) {
      GM.getValue('enabledFeatures', false).then(value => getEnabledFeatures(value)).then(function () {
        if (BANDCAMP && allFeatures.darkMode.enabled) {
          darkModeMode().then(function (yes) {
            if (yes) {
              darkMode();
            }
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }
  function onLoaded() {
    if (!enabledFeaturesLoaded) {
      GM.getValue('enabledFeatures', false).then(value => getEnabledFeatures(value)).then(function () {
        onLoaded();
      });
      return;
    }
    if (!BANDCAMP && document.querySelector('#legal.horizNav li.view-switcher.desktop a,head>meta[name=generator][content=Bandcamp]')) {
      // Page is a bandcamp page but does not have a bandcamp domain
      confirmDomain().then(function (isBandcamp) {
        BANDCAMP = isBandcamp;
        if (isBandcamp) {
          onLoaded();
          GM.registerMenuCommand(SCRIPT_NAME + ' - disable on this page', () => setDomain(false).then(() => document.location.reload()));
        } else {
          GM.registerMenuCommand(SCRIPT_NAME + ' - enable on this page', () => setDomain(true).then(() => document.location.reload()));
        }
      });
      return;
    } else if (!BANDCAMP && !CAMPEXPLORER) {
      // Not a bandcamp page -> quit
      return;
    }
    const IS_PLAYER_URL = document.location.href.startsWith(PLAYER_URL);
    const IS_PLAYER_FRAME = IS_PLAYER_URL && document.location.search.indexOf('iframe');
    if (allFeatures.darkMode.enabled) {
      // Darkmode in start() is only run on bandcamp domains
      if (!darkModeInjected) {
        darkModeMode().then(function (yes) {
          if (yes) {
            darkMode();
          }
        });
      }
      window.setTimeout(darkModeOnLoad, 0);
    }
    storeTralbumDataPermanentlySwitch = allFeatures.keepLibrary.enabled;
    const maintenanceContent = document.querySelector('.content');
    if (maintenanceContent && maintenanceContent.textContent.indexOf('are offline') !== -1) {
      console.log('Maintenance detected');
    } else {
      if (NOEMOJI) {
        addStyle('@font-face{font-family:Symbola;src:local("Symbola Regular"),local("Symbola"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.woff2) format("woff2"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.woff) format("woff"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.ttf) format("truetype"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.otf) format("opentype"),url(https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/font/Symbola.svg#Symbola) format("svg")}' + '.sharepanelchecksymbol,.bdp_check_onlinkhover_symbol,.bdp_check_onchecked_symbol,.volumeSymbol,.downloaddisk,.downloadlink,#user-nav .menubar-symbol,.listened-symbol,.mark-listened-symbol,.minimizebutton{font-family:Symbola,Quivira,"Segoe UI Symbol","Segoe UI Emoji",Arial,sans-serif}' + '.downloaddisk,.downloadlink{font-weight: bolder}');
      }
      GM.getValue('notification_timeout', NOTIFICATION_TIMEOUT).then(function (ms) {
        NOTIFICATION_TIMEOUT = parseInt(ms);
      });
      if (allFeatures.releaseReminder.enabled && !IS_PLAYER_FRAME) {
        showPastReleases();
      }
      if (document.querySelector('#indexpage .indexpage_list_cell a[href*="/album/"] img')) {
        // Index pages are almost like discography page. To make them compatible, let's add the class names from the discography page
        document.querySelector('#indexpage').classList.add('music-grid');
        document.querySelectorAll('#indexpage .indexpage_list_cell').forEach(cell => cell.classList.add('music-grid-item'));
        addStyle('#indexpage .ipCellImage { position:relative }');
      }
      if (document.querySelector('.search .result-items .searchresult img')) {
        // Search result pages. To make them compatible, let's add the class names from the discography page
        document.querySelector('.search .result-items').classList.add('music-grid');
        document.querySelectorAll(".search .result-items .searchresult[data-search*='\"type\":\"a\"'],.search .result-items .searchresult[data-search*='\"type\":\"t\"']").forEach(cell => cell.classList.add('music-grid-item'));
      }
      if (allFeatures.discographyplayer.enabled && document.querySelector('.music-grid .music-grid-item a[href*="/album/"] img,.music-grid .music-grid-item a[href*="/track/"] img')) {
        // Discography page
        makeAlbumCoversGreat();
      }
      if (document.querySelector('.inline_player')) {
        // Album page with player
        if (allFeatures.thetimehascome.enabled) {
          removeTheTimeHasComeToOpenThyHeartWallet();
        }
        if (allFeatures.albumPageVolumeBar.enabled) {
          window.setTimeout(addVolumeBarToAlbumPage, 3000);
        }
        if (allFeatures.albumPageDownloadLinks.enabled) {
          window.setTimeout(addDownloadLinksToAlbumPage, 500);
        }
        if (allFeatures.albumPageLyrics.enabled) {
          window.setTimeout(addLyricsToAlbumPage, 500);
        }
        if (allFeatures.discographyplayer.enabled) {
          addOpenDiscographyPlayerFromAlbumPage();
        }
      }
      if (document.location.pathname.startsWith('/tag/')) {
        // Tag search page
        if (allFeatures.tagSearchPlayer.enabled) {
          makeTagSearchCoversGreat();
        }
      }
      if (document.querySelector('.share-panel-wrapper-desktop')) {
        // Album page with Share,Embed,Wishlist links

        if (allFeatures.markasplayedEverywhere.enabled) {
          addListenedButtonToCollectControls();
        }
        if (document.location.hash === '#collect-wishlist') {
          clickAddToWishlist();
        }
        if (unsafeWindow.TralbumData && unsafeWindow.TralbumData.current && unsafeWindow.TralbumData.current.release_date) {
          addReleaseDateButton();
        }
      }
      if (unsafeWindow.TralbumData && unsafeWindow.TralbumData.tralbum_collect_info && unsafeWindow.TralbumData.tralbum_collect_info.is_purchased) {
        showDownloadLinkOnAlbumPage();
      }
      GM.registerMenuCommand(SCRIPT_NAME + ' - Settings', mainMenu);
      if (document.getElementById('user-nav')) {
        appendMainMenuButtonTo(document.getElementById('user-nav'));
      } else if (document.getElementById('customHeaderWrapper')) {
        appendMainMenuButtonLeftTo(document.getElementById('customHeaderWrapper'));
      } else if (document.querySelector('#corphome-autocomplete-form ul.hd-nav.corp-nav')) {
        // Homepage and not logged in
        appendMainMenuButtonTo(document.querySelector('#corphome-autocomplete-form ul.hd-nav.corp-nav'));
      }
      if (document.querySelector('.hd-banner-2018')) {
        // Move the "we are hiring" banner (not loggin in)
        document.querySelector('.hd-banner-2018').style.left = '-500px';
      }
      if (document.querySelector('.li-banner-2018')) {
        // Remove the "we are hiring" banner (logged in)
        document.querySelector('.li-banner-2018').remove();
      }
      if (document.getElementById('carousel-player') || document.querySelector('.play-carousel')) {
        window.setTimeout(makeCarouselPlayerGreatAgain, 5000);
      }
      if (document.querySelector('ol#grid-tabs li') && document.querySelector('.fan-bio-pic-upload-container')) {
        const listenedTabLink = makeListenedListTabLink();
        if (document.location.hash === '#listened-tab') {
          window.setTimeout(function resetGridTabs() {
            document.querySelector('#grid-tabs .active').classList.remove('active');
            document.querySelector('#grids .grid.active').classList.remove('active');
            listenedTabLink.classList.add('active');
            listenedTabLink.click();
          }, 500);
        }
      }
      if (allFeatures.albumPageVolumeBar.enabled) {
        restoreVolume();
      }
      if (allFeatures.markasplayedEverywhere.enabled) {
        makeAlbumLinksGreat();
      }
      if (allFeatures.backupReminder.enabled && !IS_PLAYER_FRAME) {
        checkBackupStatus();
      }
      if (allFeatures.customReleaseDateFormat.enabled) {
        formatReleaseDateOnAlbumPage();
      }
      if (allFeatures.showAlbumID.enabled) {
        showAlbumID();
      }
      if (allFeatures.feedShowOnlyNewReleases.enabled && document.querySelector('#stories li.story')) {
        feedShowOnlyNewReleases();
      }
      if (allFeatures.feedShowAudioControls.enabled && document.querySelector('#stories li.story')) {
        feedShowAudioControls();
      }
      if (CAMPEXPLORER) {
        let lastTagsText = document.querySelector('.tags') ? document.querySelector('.tags').textContent : '';
        window.setInterval(function () {
          const tagsText = document.querySelector('.tags') ? document.querySelector('.tags').textContent : '';
          if (lastTagsText !== tagsText) {
            lastTagsText = tagsText;
            if (allFeatures.discographyplayer.enabled) {
              makeAlbumCoversGreat();
            }
            if (allFeatures.markasplayedEverywhere.enabled) {
              makeAlbumLinksGreat();
            }
          }
        }, 3000);

        // Add a little space at the bottom of the page to accommodate the discographyplayer at the bottom
        document.body.style.paddingBottom = '200px';
        // Move the sidebar to the left
        document.querySelectorAll('.sidebar').forEach(function (div) {
          div.style.alignSelf = 'flex-start';
          div.querySelectorAll('.shortcuts').forEach(function (shortcuts) {
            shortcuts.style.borderRadius = '0 1em 1em 0';
          });
        });
      }
      if (IS_PLAYER_URL) {
        showExplorer();
      } else if (document.location.pathname === LYRICS_EMPTY_PATH) {
        initGenius();
      }
      GM.getValue('musicPlayerState', '{}').then(function restoreState(s) {
        if (s !== '{}') {
          GM.setValue('musicPlayerState', '{}');
          musicPlayerRestoreState(JSON.parse(s));
        }
      });
      if (document.querySelector('.inline_player') && unsafeWindow.TralbumData && unsafeWindow.TralbumData.current && unsafeWindow.TralbumData.trackinfo) {
        const TralbumData = correctTralbumData(JSON.parse(JSON.stringify(unsafeWindow.TralbumData)), document.body.innerHTML);
        storeTralbumDataPermanently(TralbumData);
      }
    }
  }
  start().then(function () {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onLoaded);
    } else {
      onLoaded();
    }
  });

})(React, ReactDOM);
//# sourceMappingURL=bundle.user.js.map
