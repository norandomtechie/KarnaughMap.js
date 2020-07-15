class KarnaughMap {
    constructor(hostDiv, options) {
        hostDiv.innerHTML = ''
        this.hostDiv = hostDiv
        this.options = options
        this.circles = {}
        this.circleCount = 0
        this.hoveredCircles = []
        this.currentCircle = 'none'
        this.drawingCircle = false

        this.drawTable()
        this.placeMinterms()
        try {
            this.placeValues('kvalues' in this.options, 'fields' in this.options ? this.fieldValues : null)
        }
        catch (err) {
            console.error ("There was an error attempting to place values into the k-map.")
            console.error (err)
            window.alert ("Warning: value placement failed.  Please check browser console for details.")
        }
        try {
            this.placeCircles('kcircles' in this.options, 'fields' in this.options ? this.fieldCircles : null)
        }
        catch (err) {
            console.error ("There was an error attempting to place circles into the k-map.")
            console.error (err)
            window.alert ("Warning: circle placement failed.  Please check browser console for details.")
        }

        this.hostDiv.querySelectorAll ('.km_minterm_odd,.km_minterm_even').forEach (td => {
            var min = document.createElement ('p')
            min.classList.add ('km_minterm_p')
            min.innerHTML = td.minterm
            td.appendChild (min)
        })
    }
    assert (condition) {
        if (!condition) throw "Assertion failed."
    }
    determineRectangle (a, b, row, col) {
        this.assert (typeof a === "object")
        this.assert (typeof b === "object")

        var x1, y1, x2, y2;
        [x1, y1] = a, [x2, y2] = b

        // this.assert (x1 >= 0 && x2 >= 0 && y1 >= 0 && y2 >= 0)

        var rects = []
        if (x1 <= x2 && y1 <= y2) { // origin to top right or top or right
            for (var i = x1; i <= x2; i++) {
                for (var j = y1; j <= y2; j++) {
                    rects.push ([i, j])
                }
            }
        }
        else if (x1 > x2 && y1 <= y2) { // origin to top left or left
            for (var i = x2; i <= x1; i++) {
                for (var j = y1; j <= y2; j++) {
                    rects.push ([i, j])
                }
            }
        }
        else if (x1 <= x2 && y1 > y2) { //origin to bottom right or bottom
            for (var i = x1; i <= x2; i++) {
                for (var j = y2; j <= y1; j++) {
                    rects.push ([i, j])
                }
            }
        }
        else if (x1 > x2 && y1 > y2) {  //origin to bottom left
            for (var i = x2; i <= x1; i++) {
                for (var j = y2; j <= y1; j++) {
                    rects.push ([i, j])
                }
            }
        }
        return rects
    }
    selectCellByXY (x, y) {
        var all = Array.from (this.hostDiv.querySelectorAll (".km_minterm_odd,.km_minterm_even"))
        for (var i = 0; i < all.length; i++) {
            if (parseInt (all[i].getAttribute ('x')) == x && parseInt (all[i].getAttribute ('y')) == y) {
                return all[i]
            }
        }
        return null
    }
    attachToRelatedCircles (cell) {
        var _this = cell.karnaughMap
        var x = parseInt (cell.getAttribute ('x'))
        var y = parseInt (cell.getAttribute ('y'))
        var xs = [x,     x,     x + 1, x - 1]
        var ys = [y - 1, y + 1, y,     y    ]
        //        //up   //dn   //rt   //lt
        /* 
            set border-radius by direction:
            right: 100% 0 0 100%
            up: 0 0 100% 100%
            down: 100% 100% 0 0 
            left: 0 100% 100% 0
        */

        // the last circle to be added will be the one we're attaching to all adjacent non diagonal circles
        var circle = cell.children [cell.childElementCount - 1]
        for (var i = 0; i < 4; i++) {
            // invalid value check
            if (xs[i] > _this.colsize - 1 || xs[i] < 0) {
                // crosses border on left/right
                xs[i] = xs[i] < 0 ? _this.colsize - 1 : 0

                // but what if cell to the other side was already a circle?  Might be part of a bigger circle
                var cellOnSide = _this.circles [_this.currentCircle].includes (_this.selectCellByXY (x + 1, y))
                var leftRight = x == 0 && xs[i] == (_this.colsize - 1) && cellOnSide
                var cellOnSide = _this.circles [_this.currentCircle].includes (_this.selectCellByXY (x - 1, y))
                var rightLeft = x == (_this.colsize - 1) && xs[i] == 0 && cellOnSide
                if (leftRight || rightLeft) {
                    continue
                }
            }
            else if (ys[i] > _this.rowsize - 1 || ys[i] < 0) {
                // crosses border on top/bottom
                ys[i] = ys[i] < 0 ?_this.rowsize - 1 : 0

                // but what if cell to the other side was already a circle?  Might be part of a bigger circle
                var cellOnSide = _this.circles [_this.currentCircle].includes (_this.selectCellByXY (x, y + 1))
                var topBottom = y == 0 && ys[i] == (_this.rowsize - 1) && cellOnSide
                var cellOnSide = _this.circles [_this.currentCircle].includes (_this.selectCellByXY (x, y - 1))
                var bottomTop = y == (_this.rowsize - 1) && ys[i] == 0 && cellOnSide
                if (topBottom || bottomTop) {
                    continue
                }
            }
            var sideCell = _this.selectCellByXY (xs[i], ys[i])
            // if sidecell is not part of large circle, the current circle should curve away from it
            var partOfKmapCircle = sideCell && _this.circles [_this.currentCircle].includes (sideCell)
            if (partOfKmapCircle) {  
                switch (i) {
                    case 0:     // up
                        circle.style.borderTopLeftRadius = "0%"
                        circle.style.borderTopRightRadius = "0%"
                        circle.style.borderTop = "0"
                        break;
                    case 1:     // Bottom
                        circle.style.borderBottomLeftRadius = "0%"
                        circle.style.borderBottomRightRadius = "0%"
                        circle.style.borderBottom = "0"
                        break;
                    case 2:     // right
                        circle.style.borderTopRightRadius = "0%"
                        circle.style.borderBottomRightRadius = "0%"
                        circle.style.borderRight = "0"
                        break;
                    case 3:     // left
                        circle.style.borderTopLeftRadius = "0%"
                        circle.style.borderBottomLeftRadius = "0%"
                        circle.style.borderLeft = "0"
                        break;
                }
            }
        }
    }
    cellContainsClass (cell, cclass) {
        var all = Array.from (cell.children).filter (child => child.classList.contains ('km_' + cclass))
        return all.length > 0
    }
    findMaximumCircle() {
        return Array.from (this.hostDiv.querySelectorAll ('.dropright > button'))
                            .map (e => parseInt (e.id.match (/[0-9]+/)[0]))
                            .reduce ((prev, next) => prev > next ? prev : next, 0)
    }
    createAssociatedCircle (cell) {
        var _this = cell.karnaughMap
        if (cell.childElementCount > 0) {
            if (Array.from (cell.children).filter (ch => ch.classList.contains ('km_' + _this.currentCircle)).length > 0) {  // already drawn
                return
            }
        }
        _this.drawingCircle = true
        _this.circleCount = _this.findMaximumCircle() + 1
        _this.currentCircle = 'circle' + _this.circleCount.toString()
        
        var circle = document.createElement ("div")
        circle.classList.add ('km_circle', 'km_circle' + _this.circleCount.toString())
        cell.appendChild (circle)

        _this.circles [_this.currentCircle] = []
        _this.circles [_this.currentCircle].push (cell)
    }
    isPowerOf2 (x) {
        return parseInt (Math.log2 (x)) === Math.log2 (x)
    }
    addToAssociatedCircle (cell) {
        var _this = cell.karnaughMap
        if (!_this.drawingCircle) return
        
        var firstcircle = _this.circles [_this.currentCircle][0]
        var lastcircle = cell
        var x1 = parseInt (firstcircle.getAttribute ('x'))
        var y1 = parseInt (firstcircle.getAttribute ('y'))
        var x2 = parseInt (lastcircle.getAttribute ('x'))
        var y2 = parseInt (lastcircle.getAttribute ('y'))
        var rect = _this.determineRectangle ( [x1, y1], [x2, y2], _this.rowsize - 1, _this.colsize - 1 )

        rect.map (xy => {
            if (xy[0] == -1) {
                xy[0] = _this.colsize - 1
            }
            else if (xy[0] == _this.colsize) {
                xy[0] = 0
            }
            if (xy[1] == _this.rowsize) {
                xy[1] = 0
            }
            else if (xy[1] == -1) {
                xy[1] = _this.rowsize - 1
            }
            return xy
        })

        if (_this.isPowerOf2 (rect.length)) {
            _this.circles [_this.currentCircle].forEach (cell => {
                Array.from (cell.children).forEach (child => {
                    if (child.classList.contains ('km_' + _this.currentCircle)) {
                        child.remove()
                    }
                })
            })
            _this.circles [_this.currentCircle] = [firstcircle]
            rect.forEach (xy => {
                var subcell = _this.selectCellByXY (xy[0], xy[1])
                if (!_this.cellContainsClass (subcell, _this.currentCircle)) {
                    var circle = document.createElement ("div")
                    circle.classList.add ('km_circle', 'km_circle' + _this.circleCount.toString())
                    subcell.appendChild (circle)
                }
                if (!_this.circles [_this.currentCircle].includes (subcell)) {
                    _this.circles [_this.currentCircle].push (subcell)
                }
            })
            _this.circles [_this.currentCircle].forEach (cell => {
                _this.attachToRelatedCircles (cell)
            })
        }
    }
    finishAssociatedCircle (cell) {
        var _this = cell.karnaughMap
        _this.drawingCircle = false
        _this.currentCircle = 'none'
    }
    updateCircleList() {
        Object.keys (this.circles).forEach (key => {
            if (this.hostDiv.querySelectorAll ('.dropright > #' + key).length == 1) return
            var btn = document.createElement ("button")
            btn.classList.add ('dropitem', 'km_circle_on')
            btn.id = key
            btn.karnaughMap = this
            btn.mode = 'on'
            btn.implicant = 'essential'

            btn.addEventListener ('mouseenter', event => {       // toggle circle
                var _this = event.currentTarget.karnaughMap 
                var cclass = event.currentTarget.id
                Array.from (_this.hostDiv.querySelectorAll ('.km_' + cclass)).forEach (e => {
                    e.style.borderColor = btn.implicant == 'essential' ? "rgba(0, 255, 0, 0.9)" : "rgba(50, 200, 200, 0.9)"
                    e.style.background = btn.implicant == 'essential' ? "rgba(0, 255, 0, 0.1)" : "rgba(50, 200, 200, 0.1)"
                })
            })

            btn.addEventListener ('mouseleave', event => {       // toggle circle
                var _this = event.currentTarget.karnaughMap 
                var cclass = event.currentTarget.id
                if (btn.classList.contains ('km_circle_on')) {
                    Array.from (_this.hostDiv.querySelectorAll ('.km_' + cclass)).forEach (e => {
                        e.style.borderColor = "black"
                        e.style.background = "transparent"
                        e.style.borderWidth = "1px"
                    })
                }
            })

            btn.addEventListener ('click', event => {       // toggle circle
                var _this = event.currentTarget.karnaughMap 
                var cclass = event.currentTarget.id
                var mode = event.currentTarget.mode
                switch (mode) {
                    case 'on':   // switch to off
                    // off mode seems useless.  Turn it off for now (pun absolutely intended)
                    // and switch to highlight instead
                        // event.currentTarget.classList.toggle ('km_circle_off', true)
                        // event.currentTarget.classList.toggle ('km_circle_on', false)
                        // event.currentTarget.classList.toggle ('km_circle_highlight_' + btn.implicant[0], false)
                        // event.currentTarget.mode = 'off'

                        event.currentTarget.classList.toggle ('km_circle_off', false)
                        event.currentTarget.classList.toggle ('km_circle_on', false)
                        event.currentTarget.classList.toggle ('km_circle_highlight_' + btn.implicant[0], true)
                        event.currentTarget.mode = 'highlight'
                        break;
                    // case 'off':   // switch to highlight
                    //     event.currentTarget.classList.toggle ('km_circle_off', false)
                    //     event.currentTarget.classList.toggle ('km_circle_on', false)
                    //     event.currentTarget.classList.toggle ('km_circle_highlight_' + btn.implicant[0], true)
                    //     event.currentTarget.mode = 'highlight'
                    //     break;
                    case 'highlight':   // switch to on
                        event.currentTarget.classList.toggle ('km_circle_on', true)
                        event.currentTarget.classList.toggle ('km_circle_highlight_' + btn.implicant[0], false)
                        event.currentTarget.classList.toggle ('km_circle_off', false)
                        event.currentTarget.mode = 'on'
                        break;
                    default:
                        throw "Wait.  That's illegal."
                }
                Array.from (_this.hostDiv.querySelectorAll ('.km_circle')).forEach (e => {
                    if (e.classList.contains ('km_' + cclass)) {
                        switch (event.currentTarget.mode) {
                            case 'on':
                                e.style.borderColor = "black"
                                e.style.background = "transparent"
                                e.style.borderWidth = "1px"
                                break;
                            // case 'off':
                            //     e.style.borderColor = "transparent"
                            //     e.style.background = "transparent"
                            //     break;
                            case 'highlight':
                                e.style.borderColor = btn.implicant == 'essential' ? "rgba(0, 255, 0, 0.9)" : "rgba(50, 200, 200, 0.9)"
                                e.style.background = btn.implicant == 'essential' ? "rgba(0, 255, 0, 0.1)" : "rgba(50, 200, 200, 0.1)"
                                break;
                            default:
                                throw "Wait.  That's illegal."
                        }
                    }
                })
            })
            btn.innerHTML = key
            var divs = document.createElement ('div')
            divs.classList.add ('km_essential_indicator')
            divs.id = btn.id + '_' + 'essential'
            divs.innerHTML = 'essential'
            btn.appendChild (divs)
            this.circleDropRight.appendChild (btn)
        })
    }
    deleteSelectedCircles(event) {
        var _this = event.currentTarget.karnaughMap
        if ('fixedCircles' in _this.options && _this.options.fixedCircles) return
        Array.from (_this.hostDiv.querySelectorAll ('.km_circle_highlight_n,.km_circle_highlight_e')).forEach (btn => {
            var circle = btn.id
            Array.from (_this.hostDiv.querySelectorAll ('.km_' + circle)).forEach (subcircle => {
                subcircle.remove()
            })
            delete _this.circles [circle]
            btn.remove()
            _this.circleCount--
        })
        if (_this.hostDiv.querySelectorAll ('.dropright > button').length == 0) {
            _this.hostDiv.querySelector ('.dropright').innerHTML = '<p>A list of circles will appear here.</p>'
        }
        _this.updateExternalCircles(_this)
    }
    deleteAllKmapCircles (event) {
        var _this = event.currentTarget.karnaughMap
        if ('fixedCircles' in _this.options && _this.options.fixedCircles) return
        Array.from (_this.hostDiv.querySelectorAll ('.km_circle')).forEach (circle => { circle.remove() })
        Array.from(_this.hostDiv.querySelector ('.dropright').children).forEach (listitem => { listitem.remove() })
        _this.hostDiv.querySelector ('.dropright').innerHTML = '<p>A list of circles will appear here.</p>'
        _this.circles = {}
        _this.circleCount = 0
        _this.updateExternalCircles(_this)
    }
    updateExternalCircles(_this) {
        if ('fixedCircles' in _this.options && _this.options.fixedCircles) return
        _this.circleField.value = JSON.stringify (Object.keys (_this.circles).map (key => {
            var set = {}
            set.type = _this.hostDiv.querySelector ('#' + key + '_essential').innerHTML[0]
            set.minterms = Array.from (_this.circles [key]).map (td => td.minterm)
            return set
        }))
    }
    circleKMap(event) {
        event.preventDefault()
        var _this = event.currentTarget.karnaughMap
        if (_this.entryMode == 'edit') return

        if (['mousedown'].includes (event.type)/*  && event.currentTarget.children.length < Object.keys (_this.circles).length + 2 */) { // starting with new k-map
            _this.createAssociatedCircle (event.currentTarget)
        }
        else if (['mouseenter'].includes (event.type)/*  && event.currentTarget.children.length < Object.keys (_this.circles).length + 2 */) { // dragging into next element
            _this.addToAssociatedCircle (event.currentTarget)
        }
        else if (['mouseup'].includes (event.type) && event.currentTarget == _this.hostDiv) {
            // check if power of 2
            if (_this.currentCircle != 'none') {
                _this.circles [_this.currentCircle].forEach (cell => {
                    _this.finishAssociatedCircle (cell)
                    _this.circleDropRight.querySelectorAll ('p').length > 0 ? _this.circleDropRight.querySelector ('p').remove() : 0
                    _this.updateCircleList()
                    _this.updateExternalCircles(_this)
                })
                _this.currentCircle = 'none'
            }
        }
        else if (['mouseup'].includes (event.type)) {  // complete circled k-map
            _this.finishAssociatedCircle (event.currentTarget)
            _this.currentCircle = 'none'
            // using a ternary operator to run a command, or return 0.  Interesting possibilities here...
            _this.circleDropRight.querySelectorAll ('p').length > 0 ? _this.circleDropRight.querySelector ('p').remove() : 0
            _this.updateCircleList()
            _this.updateExternalCircles(_this)
        }
    }
    dataEntryHandler(event) {
        var _this = event.currentTarget.karnaughMap
        if (_this.entryMode == 'circle') return
        
        event.preventDefault()
        var all = Array.from (_this.grayCode.map ((e, i) => _this.selectByMinterm (i)[0].querySelector ('.km_entry')))

        if (event.key == "Enter") {
            event.currentTarget.blur()
        }
        else if (event.key.match (/Backspace|Delete/)) {
            event.currentTarget.innerHTML = ''
        }
        else if (event.key.match (/^[1|0|d]$/i)) {
            event.currentTarget.innerHTML = event.key.toLowerCase()
            var temp = _this.valueField.value.split ("")
            temp [all.indexOf (event.currentTarget)] = event.key
            _this.valueField.value = temp.join ("")
        }
        else if (event.shiftKey && event.key == 'Tab') {
            if (all.indexOf (event.currentTarget) - 1 < 0) {
                all [all.length - 1].focus()
            }
            else {
                all [all.indexOf (event.currentTarget) - 1].focus()
            }
        }
        else if (event.key == 'Tab') {
            if ((all.indexOf (event.currentTarget) + 1) > (all.length - 1)) {
                all [0].focus()
            }
            else {
                all [all.indexOf (event.currentTarget) + 1].focus()
            }
        }
    }
    switchMode(event) {
        var _this = event.currentTarget.karnaughMap
        if (event.currentTarget.innerHTML == 'In Circle Mode') {
            Array.from (_this.hostDiv.querySelectorAll ('.km_entry')).forEach (e => {
                e.setAttribute ('contenteditable', 'true')
                e.style.cursor = 'pointer'
            })
            
            _this.entryMode = 'edit'
            event.currentTarget.innerHTML = 'In Edit Mode'
        }
        else if (event.currentTarget.innerHTML == 'In Edit Mode') {
            var filled = Array.from (_this.hostDiv.querySelectorAll ('.km_entry'))
                            .map (e => !(['&nbsp;', ' ', '']. includes (e.innerHTML)))
                            .reduce ((p, n) => p && n, true)
            if (!filled) {
                var yesorno = window.confirm ("Warning: You have not filled out all the minterm values in the Karnaugh map " + 
                                " you were editing.  Are you sure you want to perform minimizations now?")
                if (!yesorno) {
                    return
                }
            }
            Array.from (_this.hostDiv.querySelectorAll ('.km_entry')).forEach (e => {
                e.setAttribute ('contenteditable', 'false')
                e.style.cursor = 'context-menu'
            })
            _this.entryMode = 'circle'
            event.currentTarget.innerHTML = 'In Circle Mode'
        }
        else {
            alert ("DAMNATION!  WHAT DID YOU DO?")
            throw "DAMNATION!  WHAT DID YOU DO?"
        }
    }
    toggleImplicants(event) {
        var _this = event.currentTarget.karnaughMap
        Array.from (_this.hostDiv.querySelectorAll ('.km_circle_highlight_n,.km_circle_highlight_e')).forEach (btn => {
            btn.implicant = btn.implicant == 'essential' ? 'non-essential' : 'essential'
            
            btn.classList.toggle ('km_circle_highlight_' + btn.implicant[0], true)
            btn.classList.toggle ('km_circle_highlight_' + (btn.implicant[0] == 'e' ? 'n' : 'e'), false)

            Array.from (_this.hostDiv.querySelectorAll ('.km_' + btn.id)).forEach (e => {
                e.style.borderColor = btn.implicant == 'essential' ? "rgba(0, 255, 0, 0.9)" : "rgba(50, 200, 200, 0.9)"
                e.style.background = btn.implicant == 'essential' ? "rgba(0, 255, 0, 0.1)" : "rgba(50, 200, 200, 0.1)"
            })

            btn.querySelector ('#' + btn.id + '_essential').innerHTML = btn.implicant
        })
        _this.updateExternalCircles(_this)
    }
    drawTable() {
        if (!('kvariables' in this.options)) {
            throw "1 option(s) required: \n" + 
                    "'kvariables' - An array of the variable names to be used in the K-map of any size n."
        }
        else if (!('kvalues' in this.options) && 'fixedValues' in this.options && this.options.fixedValues) {
            throw "kvalues required if fixedValues is true."
        }
        else if (!('kcircles' in this.options) && 'fixedCircles' in this.options && this.options.fixedCircles) {
            throw "kcircles required if fixedCircles is true."
        }
        else if ('kcircles' in this.options) {
            this.options.kcircles = typeof (this.options.kcircles) == 'string' ? JSON.parse (this.options.kcircles) : this.options.kcircles
        }
        var size = this.options.kvariables.length
        if (size > 4) {
            throw "Unfortunately, the library does not currently support more " +
                    "than four k-map variables.  This should be updated soon."
        }
        else if (size < 2) {
            throw "Error - require at least two variables for a Karnaugh Map."
        }

        if ('fields' in this.options) {
            for (var i = 0; i < 2; i++) {
                var field = document.querySelector (this.options.fields[i])
                if (field == null) {
                    window.alert ("Error: the element" + this.options.fields[i] + " was not found.")
                    throw "Missing element '" + this.options.fields[i] + "'"
                }
                else {
                    if (i == 0) {
                        if (field.value == "") {
                            if ('kvalues' in this.options) {
                                field.value = this.options.kvalues
                            }
                        }
                        else {
                            this.fieldValues = field.value
                        }
                        this.valueField = field
                    }
                    else {
                        if (field.value == "" || field.value == "[]") {
                            if ('kcircles' in this.options) {
                                field.value = JSON.stringify (this.options.kcircles)
                            }
                        }
                        else {
                            this.fieldCircles = JSON.parse (field.value)
                        }
                        this.circleField = field
                    }
                }
            }
        }
        else {
            this.valueField = {}
            this.circleField = {}
        }

        this.rowsize = 0
        this.colsize = 0
        this.hostDiv.karnaughMap = this
        if (size % 2 == 0) {
            this.rowsize = this.colsize = Math.pow (2, parseInt (size / 2));
        }
        else {
            this.rowsize = Math.pow (2, parseInt (size / 2))
            this.colsize = Math.pow (2, parseInt (size / 2) + 1)
        }

        // add/delete circle
        this.hostDiv.innerHTML = '<div class="km_settings">\n' +
                                    '<div style="width: max-content; height: max-content; display: flex; flex-direction: row">\n' + 
                                        '<button id="selbtn" class="settingsbutton">In ' + ('kvalues' in this.options ? 'Circle' : 'Edit') + ' Mode</button>\n' +
                                        '<button id="clrbtn" class="settingsbutton">Clear circles</button>\n' +
                                        '<button id="delbtn" class="settingsbutton">Delete</button>\n' +
                                        '<button id="impbtn" class="settingsbutton">Toggle prime implicant type</button>\n' +
                                        '<div class="settingsbutton" style="padding-left: 10px">\n' +
                                            '<p class="settingstext">Show minterms</p>\n' +
                                            '<label class="switch">\n' +
                                            '    <input class="showminterm" checked="" type="checkbox">\n' +
                                            '    <span class="slider"></span>\n' +
                                            '</label>\n' +
                                        '</div>\n' +
                                    '</div>\n' +
                                    '<div class="dropright"><p>A list of circles will appear here.</p></div>\n' +
                                    '</div>'
        
        this.hostDiv.querySelector ('.showminterm').addEventListener ('change', e => { 
            if (e.currentTarget.checked) {
                // show minterms
                this.hostDiv.querySelectorAll ('.km_minterm_odd,.km_minterm_even').forEach (td => {
                    td.querySelector ('.km_minterm_p').style.opacity = '0'
                })
            } 
            else {
                // hide minterms
                this.hostDiv.querySelectorAll ('.km_minterm_odd,.km_minterm_even').forEach (td => {
                    td.querySelector ('.km_minterm_p').style.opacity = '1'
                })
            }
        })

        if ('fixedValues' in this.options && this.options.fixedValues) {
            this.hostDiv.querySelector ('#selbtn').remove()
        }
        else {
            this.selbtn = this.hostDiv.querySelector ('#selbtn')
            this.selbtn.karnaughMap = this
            this.selbtn.addEventListener ('click', this.switchMode)
        }

        if ('fixedCircles' in this.options && this.options.fixedCircles) {
            this.hostDiv.querySelector ('#delbtn').remove()
            this.hostDiv.querySelector ('#clrbtn').remove()
            this.hostDiv.querySelector ('#impbtn').remove()
        }
        else {
            this.hostDiv.querySelector ('#delbtn').karnaughMap = this
            this.hostDiv.querySelector ('#delbtn').addEventListener ('click', this.deleteSelectedCircles)
            this.clrbtn = this.hostDiv.querySelector ('#clrbtn')
            this.clrbtn.karnaughMap = this
            this.clrbtn.addEventListener ('click', this.deleteAllKmapCircles)

            this.implicantToggle = this.hostDiv.querySelector ('#impbtn')
            this.implicantToggle.karnaughMap = this
            this.implicantToggle.addEventListener ('click', this.toggleImplicants)
        }


        this.circleDropRight = this.hostDiv.querySelector (".dropright")

        var container = document.createElement ('div')
        container.classList.add ('km_container')
        container.karnaughMap = this

        var main = document.createElement ('table')
        main.classList.add ('km_table')
        main.karnaughMap = this
        var toprow = document.createElement ('tr')
        toprow.classList.add ('km_row', 'km_header')
        main.appendChild (toprow)
        // create row and,
        // generate left sidebar
        for (var i = 0; i < this.rowsize; i++) {
            var row = document.createElement ('tr')
            row.classList.add ('km_row')
            row.id = 'km_row_' + i.toString()

            var cell = document.createElement ('td')
            cell.classList.add ('km_cell')
            // cell.classList.add ('km_minterm_' + (i % 2 == 0 ? 'odd' : 'even'))
            cell.classList.add ('km_alias')
            cell.setAttribute ('x', -1)
            cell.setAttribute ('y', i)
            cell.karnaughMap = this

            row.appendChild (cell)
            main.appendChild (row)
        }
        var botrow = document.createElement ('tr')
        botrow.classList.add ('km_row', 'km_footer')
        main.appendChild (botrow)
        
        Array.from (main.children).slice (0, Array.from (main.children).length - 1).slice (1).forEach ((row, y) => {
            for (var i = 0; i < this.colsize; i++) {
                var cell = document.createElement ('td')
                cell.classList.add ('km_cell')
                cell.classList.add ('km_minterm_' + ((parseInt (row.id.match (/[0-9]+/)[0]) + i) % 2 == 0 ? 'odd' : 'even'))
                cell.setAttribute ('x', i)
                cell.setAttribute ('y', y)
                cell.karnaughMap = this
                row.appendChild (cell)
            }
            // now generate the right sidebar
            var cell = document.createElement ('td')
            cell.classList.add ('km_cell')
            cell.classList.add ('km_alias')
            cell.karnaughMap = this
            cell.setAttribute ('x', this.colsize)
            cell.setAttribute ('y', y)
            row.appendChild (cell)
        })

        for (var i = 0; i < this.colsize + 2; i++) {
            var cell = document.createElement ('td')
            cell.classList.add ('km_cell') 
            cell.classList.add ('km_alias')
            cell.setAttribute ('x', i - 1)
            cell.setAttribute ('y', -1)
            cell.karnaughMap = this
            toprow.appendChild (cell)
        }
        for (var i = 0; i < this.colsize + 2; i++) {
            var cell = document.createElement ('td')
            cell.classList.add ('km_cell')
            cell.classList.add ('km_alias')
            cell.setAttribute ('x', i - 1)
            cell.setAttribute ('y', this.rowsize)
            cell.karnaughMap = this
            botrow.appendChild (cell)
        }

        container.appendChild (main)

        // now create overlay to show variables for k-map.
        // unfortunately, these could not be created dynamically,
        // so we have to set cases for 2/3/4 variable k-maps.
        // one day... we will have 3D maps for 5+ variables.
        var overlay = document.createElement ("div")
        overlay.classList.add ('km_overlay')

        container.appendChild (overlay)

        var grid_top = document.createElement ('div')
        grid_top.classList.add ('km_overlay_top')
        
        var grid_left = document.createElement ('div')
        grid_left.classList.add ('km_overlay_left')
        
        var grid_right = document.createElement ('div')
        grid_right.classList.add ('km_overlay_right')
        
        var grid_bottom = document.createElement ('div')
        grid_bottom.classList.add ('km_overlay_bottom')
        
        function selectAliasByXY (x, y) {
            var all = Array.from (container.querySelectorAll ('.km_alias')).filter (e => 
                parseInt (e.getAttribute ('x')) == x && parseInt (e.getAttribute ('y')) == y
            )
            if (all.length > 0) {
                return all[0]
            }
            else {
                return null
            }
        }

        switch (size) {
            case 2:
                var top_p = document.createElement ('p')
                top_p.classList.add ('km_variable')
                top_p.innerHTML = this.options.kvariables [0]
                var top_ps = document.createElement ('p')
                top_ps.classList.add ('km_variable')
                top_ps.innerHTML = this.options.kvariables [0] + "'"
                grid_top.appendChild (top_p)
                grid_top.appendChild (top_ps)

                var left_p = document.createElement ('p')
                left_p.classList.add ('km_variable')
                left_p.innerHTML = this.options.kvariables [1]
                var left_ps = document.createElement ('p')
                left_ps.classList.add ('km_variable')
                left_ps.innerHTML = this.options.kvariables [1] + "'"
                grid_left.appendChild (left_p)
                grid_left.appendChild (left_ps)

                selectAliasByXY (-1, 0).style.borderBottom = '1px solid black' 
                selectAliasByXY (0, -1).style.borderRight = '1px solid black' 
                break;
            case 3:
                var top_p = document.createElement ('p')
                top_p.classList.add ('km_variable')
                top_p.innerHTML = this.options.kvariables [0]
                var top_ps = document.createElement ('p')
                top_ps.classList.add ('km_variable')
                top_ps.innerHTML = this.options.kvariables [0] + "'"
                grid_top.appendChild (top_p)
                grid_top.appendChild (top_ps)

                var left_p = document.createElement ('p')
                left_p.classList.add ('km_variable')
                left_p.innerHTML = this.options.kvariables [1]
                var left_ps = document.createElement ('p')
                left_ps.classList.add ('km_variable')
                left_ps.innerHTML = this.options.kvariables [1] + "'"
                grid_left.appendChild (left_p)
                grid_left.appendChild (left_ps)

                var bottom_p = document.createElement ('p')
                bottom_p.classList.add ('km_variable')
                bottom_p.innerHTML = this.options.kvariables [2]
                var bottom_ps = document.createElement ('p')
                bottom_ps.classList.add ('km_variable')
                bottom_ps.innerHTML = this.options.kvariables [2] + "'"
                var bottom_p2 = document.createElement ('p')
                bottom_p2.classList.add ('km_variable')
                bottom_p2.innerHTML = this.options.kvariables [2]
                grid_bottom.appendChild (bottom_p)
                grid_bottom.appendChild (bottom_ps)
                grid_bottom.appendChild (bottom_p2)

                selectAliasByXY (-1, 0).style.borderBottom = '1px solid black' 
                selectAliasByXY (1, -1).style.borderRight = '1px solid black'
                selectAliasByXY (0, 2).style.borderRight = '1px solid black'
                selectAliasByXY (3, 2).style.borderLeft = '1px solid black'
                break;
            case 4:
                var top_p = document.createElement ('p')
                top_p.classList.add ('km_variable')
                top_p.innerHTML = this.options.kvariables [0]
                var top_ps = document.createElement ('p')
                top_ps.classList.add ('km_variable')
                top_ps.innerHTML = this.options.kvariables [0] + "'"
                grid_top.appendChild (top_p)
                grid_top.appendChild (top_ps)

                var left_p = document.createElement ('p')
                left_p.classList.add ('km_variable')
                left_p.innerHTML = this.options.kvariables [1]
                var left_ps = document.createElement ('p')
                left_ps.classList.add ('km_variable')
                left_ps.innerHTML = this.options.kvariables [1] + "'"
                grid_left.appendChild (left_p)
                grid_left.appendChild (left_ps)

                var bottom_p = document.createElement ('p')
                bottom_p.classList.add ('km_variable')
                bottom_p.innerHTML = this.options.kvariables [2]
                var bottom_ps = document.createElement ('p')
                bottom_ps.classList.add ('km_variable')
                bottom_ps.innerHTML = this.options.kvariables [2] + "'"
                var bottom_p2 = document.createElement ('p')
                bottom_p2.classList.add ('km_variable')
                bottom_p2.innerHTML = this.options.kvariables [2]
                grid_bottom.appendChild (bottom_p)
                grid_bottom.appendChild (bottom_ps)
                grid_bottom.appendChild (bottom_p2)

                var right_p = document.createElement ('p')
                right_p.classList.add ('km_variable')
                right_p.innerHTML = this.options.kvariables [3]
                var right_ps = document.createElement ('p')
                right_ps.classList.add ('km_variable')
                right_ps.innerHTML = this.options.kvariables [3] + "'"
                var right_p2 = document.createElement ('p')
                right_p2.classList.add ('km_variable')
                right_p2.innerHTML = this.options.kvariables [3]
                grid_right.appendChild (right_p)
                grid_right.appendChild (right_ps)
                grid_right.appendChild (right_p2)

                selectAliasByXY (-1, 1).style.borderBottom = '1px solid black' 
                selectAliasByXY (1, -1).style.borderRight = '1px solid black'
                selectAliasByXY (4, 0).style.borderBottom = '1px solid black'
                selectAliasByXY (4, 3).style.borderTop = '1px solid black'
                selectAliasByXY (0, 4).style.borderRight = '1px solid black'
                selectAliasByXY (3, 4).style.borderLeft = '1px solid black'
                break;
            default:
                throw "Wait.  That's illegal."
        }
        
        overlay.appendChild (grid_top)
        overlay.appendChild (grid_left)
        overlay.appendChild (grid_right)
        overlay.appendChild (grid_bottom)
        
        this.hostDiv.addEventListener ('mouseup', this.circleKMap)
        this.hostDiv.appendChild (container)
    }
    generateGrayCode (n) {
        var gray = [ "0", "1" ]
        var a = [], b = []
        for (var i = 0; i < n - 1; i++) {
            a = JSON.parse (JSON.stringify (gray))
            gray.reverse()
            b = JSON.parse (JSON.stringify (gray))

            a = a.map (e => "0" + e)
            b = b.map (e => "1" + e)
            gray = a.concat (b)
        }
        return gray
    }
    selectByMinterm (min) {
        return Array.from (this.hostDiv.querySelectorAll ('.km_minterm_odd,.km_minterm_even')).filter (cell => cell.minterm == min)
    }
    placeMinterms() {
        this.grayCode = this.generateGrayCode (this.options.kvariables.length)
        var i = 0
        for (var x = 0; x < this.colsize; x++) {
            if (x % 2 == 0) {
                for (var y = 0; y < this.rowsize; y++) {
                        this.selectCellByXY (x, y).minterm = parseInt (this.grayCode [i++], 2)
                }
            }
            else {
                for (var y = this.rowsize - 1; y >= 0; y--) {
                    this.selectCellByXY (x, y).minterm = parseInt (this.grayCode [i++], 2)
                }
            }
        }
    }
    placeValues(useValues, fieldValues) {
        var selectedValues = fieldValues || this.options.kvalues
        var useFieldData = fieldValues != null

        if (useValues && parseInt (Math.pow (2, this.options.kvariables.length)) != this.options.kvalues.length) {
            window.alert ("Error during k-map value placement - " + 
                            "number of k-map values do not correspond " +
                            "to number of variables.  Some values will be " + 
                            "truncated or missing.")
        }

        this.grayCode.forEach (bin => {
            var cell = this.selectByMinterm (parseInt (bin, 2))[0]
            var val = (useValues || useFieldData) ? selectedValues [parseInt (bin, 2)].toString() : '&nbsp;'
            var ptr = (useValues || useFieldData) ? 'context-menu' : 'pointer'
            cell.innerHTML = '<p class="unselectable info km_entry" style="cursor: ' + ptr + '" >' + val + '</p>';
            ['mousedown', 'mouseenter', 'mouseleave', 'mouseup'].forEach (eventType => {
                cell.addEventListener (eventType, this.circleKMap)
            })
        })
        
        Array.from (this.hostDiv.querySelectorAll ('.km_alias')).forEach (cell => {
            cell.addEventListener ('mouseenter', this.circleKMap)
            cell.addEventListener ('mouseup', this.circleKMap)
        })
        if (!('fixedValues' in this.options) || !this.options.fixedValues) {
            Array.from (this.hostDiv.querySelectorAll ('.km_entry')).forEach (e => {
                e.karnaughMap = this
                e.setAttribute ('contenteditable', 'true')
                e.addEventListener ('click', (e) => { e.currentTarget.focus() })
                e.addEventListener ('keydown', this.dataEntryHandler)
            })
        }

        if (useFieldData || useValues) {
            this.valueField.value = selectedValues
        }
        else {
            this.valueField.value = " ".repeat (Math.pow (2, this.options.kvariables.length))
        }

        if (!useValues && !this.options.fixedValues) {
            this.entryMode = 'edit'
        }
        else {
            this.entryMode = 'circle'
        }
    }
    placeCircles (useCircles, fieldCircles) {
        var selectedCircles = fieldCircles || this.options.kcircles
        var useFieldData = fieldCircles != null
        
        if (useCircles || useFieldData) {
            this.circleField.value = JSON.stringify (selectedCircles)
        }
        else {
            this.circleField.value = '[]'
        }

        if (!useCircles && !useFieldData) return

        this.circles = {}
        selectedCircles.forEach ((set, idx) => {
            this.currentCircle = 'circle' + (idx + 1).toString()
            this.circles [this.currentCircle] = []
            for (var i = 0; i < set.minterms.length; i++) {
                var minterm = set.minterms[i];
                try {
                    var element = this.selectByMinterm (minterm)[0]
                }
                catch (err) {
                    console.error (err)
                    throw "Error parsing kcircles array."
                }
                var cir = document.createElement ("div")
                cir.classList.add ('km_circle', 'km_circle' + (idx + 1).toString())
                element.appendChild (cir)
                this.circles [this.currentCircle].push (element)
            }
            this.circles [this.currentCircle].forEach (cell => {
                this.attachToRelatedCircles (cell)
            })
            this.circleCount++
        })
        this.circleDropRight.innerHTML = ''
        this.updateCircleList()
        selectedCircles.forEach ((set, idx) => {
            var circle = this.hostDiv.querySelector ('#circle' + (idx + 1))
            var implicant = set.type.match (/^n$/i) ? 'non-essential' : 'essential'
            circle.implicant = implicant
            circle.querySelector ('.km_essential_indicator').innerHTML = implicant
        })
        this.currentCircle = 'none'
        this.updateExternalCircles(this)
    }
}
