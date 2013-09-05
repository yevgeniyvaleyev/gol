/**
 * Conway's Game of Life, Javascript implementation
 * @author Yevgeniy Valeyev
 */

var gol = function () {
    var paused  = true,
        game_id = '#gol',
        delay   = 0,
        cell_size = 4,
        canvas = document.getElementById('board'),
        ctx = canvas.getContext('2d'),
        worker_src = 'js/gol.worker.js',
        old_life_collection = [],
        worker = null,
        worker_callbacks = [],
        color = {
            visited: '#031405',
            old_age_1: '#fca1a1',
            old_age_2: '#fc6464',
            critical: {
                state_1: 'red',
                state_2: 'white'
            }
        },
        delay_button = '#delay',
        run_button = '.run',
        reload_button = '.reload'

    /**
     * Inits the game.
     * @access public
     * @return null
     */
    this.init = function () {
        $(window).resize(function () {
            initBoard(run);
        })
        initBoard();
        initActions();
    }

    /**
     * Returns mouse position on canvas
     * @param canvas
     * @param evt
     * @returns {{x: number, y: number}}
     */
    var getCellPos = function (canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: parseInt((evt.clientX - rect.left) / cell_size, 10),
            y: parseInt((evt.clientY - rect.top) / cell_size, 10)
        };
    }

    /**
     * Adds new life
     */
    var addLife = function (event) {
        var mouse_pos = getCellPos(this, event);
        generateData('new_life', mouse_pos);
    }

    /**
     * Inits delay control.
     * @access private
     * @return null
     */
    var initDelayControl = function () {
        for (var d = 0; d <= 1000; d += 100) {
            var sel = (delay == d) ? 'selected="selected"' : '';
            $(delay_button, game_id).append('<option value="' + d + '" ' + sel + '>' + d + '</option>');
        };
        $(delay_button, game_id).bind('change', function () {
            delay = $(this).val();
        });
    };

    /**
     * Inits events.
     * @access private
     * @return null
     */
    var initActions = function () {
        $(run_button, game_id).bind('click', run);
        $(reload_button, game_id).bind('click', initBoard);
        $(canvas).bind('click', addLife);
        initDelayControl();
    };

    /**
     * Inits shape
     */
    var initShape = function (row_length, map_length) {
        var width = row_length * cell_size,
            height = map_length * cell_size;

        canvas.width = width;
        canvas.height = height;
    }

    /**
     * Iterates 2D collection
     * @param collection
     * @param callback
     */
    var iterateCollection = function (collection, callback) {
        collection.forEach(function (items_list, items_list_key) {
            items_list.forEach(function (item, item_key) {
                if (callback) {
                    callback({
                        items_list_key: items_list_key,
                        item_key: item_key,
                        item: item
                    });
                }
            });
        });
    }

    /**
     * Draws a cell
     * @param x
     * @param y
     * @param color
     */
    var drawCell = function (x, y, radius, color) {
        var x0 = x * cell_size + cell_size / 2,
            y0 = y * cell_size + cell_size / 2;

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(x0, y0, radius, 0, Math.PI * 2, true);
        ctx.fill();
    }

    /**
     * Creates lived cells
     * @param life_collection
     */
    var drawLivedCells = function (life_collection) {
        var radius = (cell_size / 2) * 1.1;

        iterateCollection(old_life_collection, function (data) {
            drawCell(data.item.x_position, data.items_list_key, radius, color.visited);
        });
        old_life_collection = life_collection;
    }

    /**
     * Returns critical color
     * @param age
     * @returns {string}
     */
    var getColor = function (age) {
        var age_1_hue = (age <= 250) ? age : 250,
            age_2_hue = (age > 250 && age <= 500) ? age - 250 : 0;

        if (age > 3000) {
            return (age % 2) ? color.critical.state_1 : color.critical.state_2;
        }
        if (age > 2000) {
            return color.old_age_2;
        }
        if (age > 1000) {
            return color.old_age_1;
        }
        if (age > 500) {
            age_2_hue = 250;
        }
        return 'rgba(' + age_1_hue + ',250, ' + age_2_hue + ',1)';
    }

    /**
     * Draws life
     * @param map
     */
    var drawLife = function (life_collection) {
        var radius = cell_size / 3;

        drawLivedCells(life_collection);
        iterateCollection(life_collection, function (data) {
            drawCell(data.item.x_position, data.items_list_key, radius, getColor(data.item.age));
        });
    }

    /**
     * Generates
     * @param callback
     */
    var generateData = function (type, data, callback) {
        if (!!window.Worker) {
            if (!worker_callbacks[type]) {
                worker_callbacks[type] = callback;
            }
            if (!worker) {
                worker = new Worker(worker_src);
            }
            worker.postMessage({
                type: type,
                data: data
            });
            worker.onmessage = function (event) {
                if (!!worker_callbacks[event.data.type]) {
                    worker_callbacks[event.data.type](event.data.data);
                }
            };
        } else {
            console.log('Your browser does not support Web Workers!');
        }
    }

    /**
     * Inits a board of the game.
     * @access private
     * @return null
     */
    var initBoard = function (callback) {
        var params = {
            x: parseInt(window.innerWidth / cell_size),
            y: parseInt(window.innerHeight / cell_size)
        }
        generateData('initial', params, function (data) {
            initShape(data.cols, data.rows);
            drawLife(data.map);
            if (callback) {
                callback();
            }
        });
    }

    /**
     * Generates a new genegation
     * @access private
     * @return null
     */
    var generation = function (callback) {
        generateData('generation', {}, function (data) {
            drawLife(data);
            callback();
        });
    };

    /**
     * Runs or pauses the game.
     * @access private
     * @return null
     */
    var run = function (event) {
        var self = this;
        if (event) {
            paused = !paused;
        }
        generation(function () {
            if (!paused) {
                $(self).val('stop');
                setTimeout(run, delay);
            } else {
                $(self).val('run');
            }
        });
    };

    return {
        init : this.init
    };
};

// Inits the game on load        
$(function () {
    gol().init();
});
