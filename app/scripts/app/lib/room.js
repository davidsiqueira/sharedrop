ShareDrop.Room = function (firebaseRef) {
    this._ref = firebaseRef;
    this.name = null;
};

ShareDrop.Room.prototype.join = function (user) {
    var self = this;

    // Get room name
    $.getJSON('/room')

    // Join room and listen for changes
    .then(function (data) {
        self.name = data.name;
        user.public_ip = data.public_ip;

        // Setup Firebase refs
        self._connectionRef = self._ref.child('.info/connected');
        self._roomRef = self._ref.child('rooms/' + self.name);
        self._usersRef = self._roomRef.child('users');
        self._userRef = self._usersRef.child(user.uuid);

        console.log('Room:\t Connecting to: ', self.name);

        self._connectionRef.on('value', function (snapshot) {
            // Once connected (or reconnected) to Firebase
            if (snapshot.val() === true) {
                console.log('Firebase: (Re)Connected');

                // Remove yourself from the room when disconnected
                self._userRef.onDisconnect().remove();

                // Join the room
                self._userRef.set(user, function (error) {
                    console.log('Firebase: User added to the room');
                    // Create a copy of user data,
                    // so that deleting properties won't affect the original variable
                    $.publish('connected.room', $.extend(true, {}, user));
                });

                self._usersRef.on('child_added', function (snapshot) {
                    var user = snapshot.val();

                    console.log('Room:\t user_added: ', user);
                    $.publish('user_added.room', user);
                });

                self._usersRef.on('child_removed', function (snapshot) {
                    var user = snapshot.val();

                    console.log('Room:\t user_removed: ', user);
                    $.publish('user_removed.room', user);
                }, function () {
                    // Handle case when the whole room is removed from Firebase
                    $.publish('disconnected.room');
                });

                self._usersRef.on('child_changed', function (snapshot) {
                    var user = snapshot.val();

                    console.log('Room:\t user_changed: ', user);
                    $.publish('user_changed.room', user);
                });
            } else {
                console.log('Firebase: Disconnected');

                $.publish('disconnected.room');
                self._usersRef.off();
            }
        });
    });

    return this;
};

ShareDrop.Room.prototype.update = function (attrs) {
    this._userRef.update(attrs);
};
