function concatArray(a, b) {
        var c = new Int16Array(a.length + b.length);
        c.set(a);
        c.set(b, a.length);
        return c
    }

    class Vector2D {
        constructor(x=0, y=0) {

            this.x = x
            this.y = y
        }

        isZero() {
            return this.x == 0 && this.y == 0;
        }

        json(){
            return {
                x: this.x,
                y: this.y,
            }
        }
    }

    class Size {
        constructor(width=0, height=0){
            this.width = width;
            this.height = height;
        }

        json(){
            return {
                width:  this.width,
                height: this.height,
            }
        }
    }

    class Point {
        constructor(x=0, y=0, z=0) {
            this.x = x
            this.y = y
            this.z = z
        }

        json(){
            return {
                x: this.x,
                y: this.y,
                z: this.z,
            }
        }
    }

    function toPoint(json) {
        var point = new Point();
        point.x = json.x
        point.y = json.y
        point.z = json.z
        return point
    }

    class Object {
        constructor() {
            this.size = new Size()
            this.position = new Point()
            this.speed = new Vector2D();
            this.moveVector = new Vector2D();
            this.id = undefined;
            this.friction = new Vector2D(1,1)
            this.maxSpeed = 10;
        }
        update() {



            if (this.moveVector.y == -1) {
                if (this.speed.y <= -this.maxSpeed ){
                    this.speed.y = -this.maxSpeed
                } else {
                    this.speed.y -= 2
                }
            }

            if (this.moveVector.y ==  1) {
                if (this.speed.y >= this.maxSpeed ){
                    this.speed.y = this.maxSpeed
                } else {
                    this.speed.y += 2
                }
            }

            if (this.moveVector.x == -1) {
                if (this.speed.x <= -this.maxSpeed ){
                    this.speed.x = -this.maxSpeed
                } else {
                    this.speed.x -= 2
                }
            }

            if (this.moveVector.x ==  1) {
                if (this.speed.x >= this.maxSpeed ){
                    this.speed.x = this.maxSpeed
                } else {
                    this.speed.x += 2
                }
            }
            if (this.speed.x < 0) {
                this.speed.x += this.friction.x
                if (this.speed.x > 0){
                    this.speed.x = 0
                }
            } else if (this.speed.x > 0) {
                this.speed.x -= this.friction.x
                if (this.speed.x < 0){
                    this.speed.x = 0
                }
            }

            if (this.speed.y < 0) {
                this.speed.y += this.friction.y
                if (this.speed.y > 0){
                    this.speed.y = 0
                }
            } else if (this.speed.y > 0) {
                this.speed.y -= this.friction.y
                if (this.speed.y < 0){
                    this.speed.y = 0
                }
            }
        }
        render() {}

        _loop() {
            this.update();
            this.move();
            this.render();
        }
        move() {
            if (!this.speed.isZero()) {

                this.position.x += this.speed.x*5;
                this.position.y += this.speed.y*5;

            }
        }
    }


    class Player extends Object {

        constructor(position, color) {
            super();

            this.moveVector = new Vector2D(0,0)
            this.position = position
            this.rect = new Rect(this.position, new Size(100, 100), "green")
            this.updateCount = 0;
        }

        isMoving() {
            return this.speed.x !== 0 || this.speed.y !== 0;
        }

        render() {

            super.render();

            this.rect.position = this.position;
            this.rect.render()
        }

    }



    class OnlineObject extends Player {

        constructor(position, color) {
            super(position, color)
            this.nextPosition = new Vector2D();
            this.timer = undefined;
            this.friction.x = 0
            this.friction.y = 0
            this.futureMoves = []
        }


        move() {
            if (this.timer != undefined){
                if (this.timer > 0) {
                    this.position.x += this.speed.x;
                    this.position.y += this.speed.y;
                    this.timer--;
                } else if (this.futureMoves.length > 0) {
                    var position = this.futureMoves.shift().position;
                    while (position.x == NaN || position.y == NaN) {
                        position = this.futureMoves.shift().position;
                    }

                    if (position) {
                        this.moveTo(position.x, position.y)
                        this.position.x += this.speed.x;
                        this.position.y += this.speed.y;
                        this.timer--;
                    }

                } else {
                    console.log("1")
                    this.position.x = this.nextPosition.x
                    this.position.y = this.nextPosition.y
                    this.speed = new Vector2D(0,0)
                    this.timer = undefined;
                }
            }
        }

        moveTo(x, y) {
            // clearInterval(this.moveToInterval)
            // var _this = this;
            if (this.position.x == x && this.position.y == y) return;
            console.log(x,y)
            this.nextPosition = new Vector2D(x,y)
            this.timer = Math.floor(Math.sqrt( Math.pow(x-this.position.x, 2) + Math.pow(y-this.position.y, 2))/(this.maxSpeed*5))
            if (this.timer == 0) {
                this.speed = new Vector2D(0,0)
            } else {
                this.speed = new Vector2D((x-this.position.x)/this.timer, (y-this.position.y)/this.timer)
            }

            // this.moveToInterval = setInterval(function() {

            // }, )
        }
    }

    class Rect {
        constructor(position=new Point(), size=new Size(), color="black") {
            this.size = size;
            this.position = position;
            this.color = color;
        }

        render() {
            scene.ctx.fillStyle = this.color;
            scene.ctx.fillRect(this.position.x, this.position.y, this.size.width, this.size.height);
        }
    }

    class MyPlayer extends Player {
        constructor(position, color) {

            super(position, color);

            this.emitUpdate = 0;
            this.emitTimer = undefined;
            this.stream = new Int16Array(0)
            var _this = this;

            document.onkeydown = function(e){
                if (e.keyCode == "37" && _this.moveVector.x != -1) {
                    _this.moveVector.x = -1
                    _this.emitUpdate = _this.emitUpdate == 0 ? 1 : 2;
                }
                else if (e.keyCode == "38" && _this.moveVector.y != -1 ) {
                    _this.moveVector.y = -1
                    _this.emitUpdate = _this.emitUpdate == 0 ? 1 : 2;
                }
                else if (e.keyCode == "39" && _this.moveVector.x != 1) {
                    _this.moveVector.x = 1
                    _this.emitUpdate = _this.emitUpdate == 0 ? 1 : 2;
                }
                else if (e.keyCode == "40" && _this.moveVector.y != 1) {
                    _this.moveVector.y = 1
                    _this.emitUpdate = _this.emitUpdate == 0 ? 1 : 2;
                }
            }

            document.onkeyup = function(e){
                if (e.keyCode == "37" && _this.moveVector.x != 0) {
                    _this.moveVector.x = 0
                    _this.emitUpdate = 3;
                }
                else if (e.keyCode == "38" && _this.moveVector.y != 0 ) {
                    _this.moveVector.y = 0
                    _this.emitUpdate = 3;
                }
                else if (e.keyCode == "39" && _this.moveVector.x != 0) {
                    _this.moveVector.x = 0
                    _this.emitUpdate = 3;
                }
                else if (e.keyCode == "40" && _this.moveVector.y != 0) {
                    _this.moveVector.y = 0
                    _this.emitUpdate = 3;
                }
            }
            this.emitTimer = setInterval(function() {
                _this.emitStream()
            }, 80)
        }

        emitStream() {
            if (this.stream.length > 0) {
                socket.emit("update", this.stream.buffer)
                this.stream = new Int16Array(0)
            }
        }

        move() {
            super.move()
            if (this.emitUpdate > 0) {
                var a = new Int16Array(5)
                a[0] = this.id
                a[1] = this.updateCount++
                a[2] = this.position.x
                a[3] = this.position.y
                a[4] = this.position.z
                this.stream = concatArray(this.stream, a);
            }
            if (this.emitUpdate == 1) {
                var _this = this
                this.emitStream()

                this.emitTimer = setInterval(function() {
                    _this.emitStream()
                }, 80)
            } else if (this.emitUpdate == 3) {
                this.emitUpdate = 0;
            }


        }
    }


    class Scene {
        constructor() {
            this.canvas = $('<canvas id="scene" class="scene">');
            $("body").append(this.canvas)
            this.canvas[0].width = 1900;
            this.canvas[0].height = 900;
            this.ctx = this.canvas[0].getContext('2d');
            this.objects = []
            this.player = null;
        }

        add(object) {
            this.objects.push(object);
        }


        loop() {
            this.ctx.clearRect(0, 0, this.canvas[0].width, this.canvas[0].height);
            for (var i = 0; i < this.objects.length; i++) {
                scene.objects[i]._loop();
            }
        }

        addPlayer(player) {

        }

        addOnlinePlayer(player) {
            var newPlayer = new OnlineObject(toPoint(player.position), player.color)
            newPlayer.id = player.id
            this.objects.push(newPlayer)
            return newPlayer
        }

        setPlayers(data) {
            for (var i = 0; i < data.players.length; i++) {
                if (this.objects.reduce((acc, cur) => acc || cur.id == data.id, false)) {
                    continue
                }
                if (data.players[i].id === data.id) {
                    this.player = new MyPlayer(toPoint(data.players[i].position), data.players[i].color)
                    this.player.id = data.players[i].id
                    this.objects.push(this.player)
                }
                else {
                    this.addOnlinePlayer(data.players[i])

                }
            }
        }
    }
    var scene = new Scene()



    setInterval(function() { scene.loop() }, 40)

    class Socket {
        constructor(url) {
            this.socket = io(url);
            var _this = this;
            this.socket.on('connect', function(s) {
                const urlParams = new URLSearchParams(window.location.search);
                _this.socket.emit('login', {user: urlParams.get('user'), keu: "key"});
            });

            this.socket.on("login", function(data) {
                scene.setPlayers(data)
            })

            this.socket.on("newPlayer", function(data) {
                if (data.id != scene.player.id) {
                    scene.addOnlinePlayer(data.player)
                }
            })

            this.socket.on("update", function(data) {
                var array = new Int16Array(data)
                var moves = []
                for (var i = 0; i < array.length/5; i++) {
                    moves.push({
                        id: array[i*5],
                        update: array[i*5+1],
                        position: new Vector2D(array[i*5+2], array[i*5+3], array[i*5+4])
                    })
                }

                data = moves.shift();
                // console.log(data, moves)
                for (var i = 0; i < scene.objects.length; i++) {
                    var object = scene.objects[i];

                    if (object.id == data.id) {
                        if (object.timer > 0) {
                            if (!object.futureMoves[object.futureMoves.length-1] || object.futureMoves[object.futureMoves.length-1].update < data.update) {
                                // if (object.futureMoves.length < 5){
                                //     // pass
                                // } else if (object.futureMoves.length < 10){
                                //     object.futureMoves.shift()
                                // } else if (object.futureMoves.length < 15){
                                //     object.futureMoves = object.futureMoves.slice(2)
                                // } else if (object.futureMoves.length < 20){
                                //     object.futureMoves = object.futureMoves.slice(4)
                                // } else {
                                //     object.futureMoves = object.futureMoves.slice(8)
                                // }
                                object.futureMoves.push(data)
                                object.futureMoves.concat(moves)
                                // console.log(object.futureMoves.length, object.futureMoves[object.futureMoves.length-1].position)
                            } else {
                                // console.log("OCURRIO")
                            }
                        } else if (object.updateCount < data.update){
                            // console.log(object)
                            object.moveTo(data.position.x, data.position.y)
                            object.updateCount = data.update
                            object.futureMoves.concat(moves)
                        }
                        // console.log(object.updateCount, data.update)
                    }
                }
            })
        }

        emit(message, data) {
            this.socket.emit(message, data)
        }
    }

    // var socket = new Socket("ws://ec2-3-90-8-99.compute-1.amazonaws.com:25330");
    var socket = new Socket("ws://0.0.0.0:5000");



    // setInterval(function(){
    //     for (var i = scene.objects.length - 1; i >= 0; i--) {
    //         if (scene.objects[i].id == "85048581-ff2b-461d-8131-65ff913bf970") {
    //             console.log(scene.objects[i].position)
    //         }
    //     }
    // }, 1000)


    // function hola() {

    // }