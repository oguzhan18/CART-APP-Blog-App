//------------------
// Setup Firebase
//------------------
let firebaseConfig = {
  authDomain: "angularcurd-a8b2b.firebaseapp.com",
  databaseURL: "https://angularcurd-a8b2b-default-rtdb.firebaseio.com" };


firebase.initializeApp(firebaseConfig);
let presenceRef = firebase.database().ref(".info/connected"),
usersRef = firebase.database().ref('users'),
imagesRef = firebase.database().ref('images');

//------------------
// Vue
//------------------
new Vue({
  el: '#vue',

  beforeMount() {
    this.loginButtonText = this.loginButtonTextOptions.new;
    this.notification = this.notifications["landing"];
    this.logout();
  },

  mounted() {
    //prevent initial flash
    document.getElementById("vue").classList.remove("hidden");

    //start masonry on data return
    imagesRef.on("value", () => {
      if (this.loading == true) {
        this.loading = false;
        Vue.nextTick(this.startMasonry);
      }
    });
  },

  firebase() {
    return {
      users: usersRef,
      images: imagesRef };

  },

  data() {
    return {
      //login data 
      newUser: {
        username: "",
        password: "" },

      myRef: "",
      myKey: "",
      myUsername: "",
      timer: null,
      loginAttempts: 0,
      notifications: {
        "landing": "Try to be original, your username might be taken.",
        "missing": "Please enter a username AND password.",
        "error": "We have encountered an error, please reload your page and try again.",
        "invalid": "Sorry, your password is invalid. Make sure you have everything correct. Caps matter!",
        "loggedIn": "This user is already logged in.",
        "lockedOut": "You have attempted to login too many times, please come back later and try again." },

      loginButtonTextOptions: {
        "new": "Create Account",
        "existing": "Log In" },

      loginButtonText: "",
      showLogin: false,
      notification: "",
      notificationStatus: "good",
      loginButtonText: "",
      loggedIn: false,
      //show/hide data
      loading: true,
      showImageModal: false,
      showAddModal: false,
      showDeleteModal: false,
      //masonry
      masonry: '',
      imagesLoaded: false,
      //local data
      imageModalData: {},
      imagesSearchString: '',
      title: 'Oğuzhan ÇART - ÇART APP Blog',
      description: '',
      notLoggedInDescription: '',
      loggedInDescription: 'Like, or download with stats icons.',
      loggedInLoginDescription: 'You\'re are logged in. Read and like articles. :-) ',
      noResultsText: 'No results, try a new search!',
      inputPlaceholder: 'Search an blog\'s name, tags, or stats',
      modalData: {
        modalType: '',
        title: '',
        url: '',
        tags: [''],
        creator: '' } };


  },

  computed: {
    filteredImages() {
      this.reloadMasonry();

      return this.images.filter(images => {
        let searchRegex = new RegExp(this.imagesSearchString.replace(/[^a-zA-Z0-9 ]/g, ''), 'i');

        return (
          searchRegex.test(images.title) ||
          searchRegex.test(images.url) ||
          searchRegex.test(images.tags) ||
          searchRegex.test(images.likes) ||
          searchRegex.test(images.views) ||
          searchRegex.test(images.downloads) ||
          searchRegex.test(images.creator));

      });
    } },


  methods: {
    //presence methods
    toggleLogin() {
      this.showLogin = !this.showLogin;
    },

    isExistingUser() {
      for (let i = 0; i < this.users.length; i++) {
        if (this.newUser.username == this.users[i].username) {
          this.loginButtonText = this.loginButtonTextOptions.existing;
          return;
        }
      }

      this.loginButtonText = this.loginButtonTextOptions.new;
    },

    login() {
      if (this.newUser.username == "" || this.newUser.password == "") {
        this.notificationStatus = "bad";
        this.notification = this.notifications.missing;
        return;
      }

      if (this.loginAttempts < 5) {
        if (typeof this.users == "undefined" || this.users.length == 0) {
          this.setPresence();
          this.toggleLogin();
        }

        for (let i = 0; i < this.users.length; i++) {
          if (this.newUser.username == this.users[i].username) {
            if (this.newUser.password != this.users[i].password) {
              this.loginAttempts++;
              this.notificationStatus = "bad";
              this.notification = this.notifications.invalid;
              return;
            }

            if (!!this.users[i].online) {
              this.loginAttempts++;
              this.notificationStatus = "bad";
              this.notification = this.notifications["loggedIn"];
              return;
            }

            this.myKey = this.users[i][".key"];
            this.myRef = firebase.database().ref('users/' + this.myKey);
          }
        }

        if (this.newUser.username.trim() != "" && this.newUser.password.trim() != "") {
          this.setPresence();
          this.toggleLogin();
        }

      } else {
        this.notificationStatus = "bad";
        this.notification = notifications["lockedOut"];
        return;
      }
    },

    setPresence() {
      let self = this;

      if (this.myKey == "" && this.newUser.username != "" && this.newUser.password != "") {
        usersRef.push().set({
          online: true,
          username: self.newUser.username,
          password: self.newUser.password },

        function () {
          self.myUsername = self.newUser.username;

          let usersLength = self.users.length;
          if (usersLength > 0) {
            usersLength = usersLength - 1;
          }

          self.myKey = self.users[usersLength][".key"];
          self.myRef = firebase.database().ref('users/' + self.myKey);
          self.myRef.onDisconnect().update({ online: false });
        });

      } else if (typeof this.myKey != "undefined" && this.myKey != "") {
        this.myUsername = this.newUser.username;
        this.myRef.update({ online: true });
        this.myRef.onDisconnect().update({ online: false });
      }

      this.loggedIn = true;

      this.$nextTick(() => {
        if (this.myUsername == "" || this.myUsername == "undefined") {
          this.myUsername = this.newUser.username;
          this.firstLogOn = true;
        }

        let usersLength = this.users.length;
        if (usersLength > 0) {
          usersLength = usersLength - 1;
        }

        if (this.myKey == "" || this.myKey == "undefined") {
          this.myKey = this.users[usersLength][".key"];
        }
      });
    },

    logout() {
      if (this.myRef != "" && typeof this.myRef != "undefined") {
        this.myUsername = "";
        this.myRef.update({ online: false });
        this.myRef = "";
        this.myKey = "";
        this.newUser = {
          username: "",
          password: "" };


        this.isExistingUser();
        this.loggedIn = false;
        this.toggleLogin();
      }
    },

    //image methods
    resetSearchString() {
      this.imagesSearchString = '';
    },

    likeImage(image) {
      let self = this;

      if (this.myRef == "" || this.myRef == "undefined") {
        this.toggleLogin();
        this.showImageModal = false;
        return;
      }

      this.myRef.child("votes").child(image['.key']).once('value').then(function (snapshot) {
        if (!!snapshot.val() && !!snapshot.val().voted) {
          return;
        }

        image.likes = image.likes + 1;
        self.myRef.child("votes").child(image['.key']).update({ voted: true });
        imagesRef.child(image['.key']).update({ likes: image.likes });
      });
    },

    downloadImage(image) {
      image.downloads = image.downloads + 1;
      imagesRef.child(image['.key']).update({ downloads: image.downloads });

      let link = document.createElement('a');
      document.body.appendChild(link);
      link.href = image.url;
      link.download = image.url;
      link.click();
    },

    incrimentViews(image) {
      image.views = image.views + 1;
      imagesRef.child(image['.key']).update({ views: image.views });
    },

    viewImageInModal(image, index) {
      this.imageModalData = image;
      this.imageModalData.index = index;
      this.incrimentViews(image);
      this.toggleImageModal();
    },

    toggleImageModal() {
      this.showImageModal = !this.showImageModal;

      if (this.showImageModal == true) {
        Vue.nextTick(() => {
          //workaround for modalWrapper focus is to save scroll position, focus, and scrollTo same position
          let x = window.scrollX,y = window.scrollY;
          document.getElementById('imageModalWrapper').focus();
          window.scrollTo(x, y);
        });
      }
    },

    changeModalImage(index, direction) {
      let nextImage,
      imagesLength = this.images.length;

      if (direction == 'prev') {
        nextImage = index - 1;
      } else {
        nextImage = index + 1;
      }

      if (nextImage >= imagesLength) {
        nextImage = 0;

      } else if (nextImage < 0) {
        nextImage = imagesLength - 1;
      }

      this.imageModalData = this.images[nextImage];
      this.imageModalData.index = nextImage;
      this.incrimentViews(this.images[nextImage]);
    },

    toggleAddEditModal(type, sentImage, sentIndex) {
      this.showAddModal = !this.showAddModal;

      if (this.showAddModal == true) {
        if (type === 'add') {
          this.modalData.modalType = 'Add';
          this.modalData.creator = this.myUsername;

        } else if (type === 'edit') {
          this.modalData = sentImage;
          this.modalData.modalType = 'Edit';
          this.modalData.index = sentIndex;

        }

        Vue.nextTick(() => {
          let x = window.scrollX,y = window.scrollY;
          document.getElementById('addEditModalWrapper').focus();
          window.scrollTo(x, y);
        });

      } else {
        this.resetAddEditModalData();
      }
    },

    toggleDeleteModal(cancel) {
      this.showDeleteModal = !this.showDeleteModal;
      this.showAddModal = !!cancel ? true : false;
    },

    addTag() {
      this.modalData.tags.push('');
    },

    removeTag(index) {
      this.modalData.tags.splice(index, 1);
    },

    resetAddEditModalData() {
      this.modalData = {
        modalType: '',
        title: '',
        url: '',
        tags: [''],
        creator: '' };

    },

    addNewImage() {
      let newImageData = JSON.parse(JSON.stringify(this.modalData));

      for (let key in newImageData) {
        if (key == "tags") {
          newImageData[key].forEach(tag => {
            if (tag == '') {
              return;
            }
          });
        } else {
          if (newImageData[key] === '') {
            return;
          }
        }
      }

      newImageData.likes = 0;
      newImageData.views = 0;
      newImageData.downloads = 0;
      delete newImageData.modalType;

      imagesRef.push(newImageData);

      this.resetAddEditModalData();
      this.toggleAddEditModal();
    },

    updateImage() {
      let imageData = JSON.parse(JSON.stringify(this.modalData)),
      imageKey = imageData['.key'];

      delete imageData['.key'];
      delete imageData.modalType;

      for (let key in imageData) {
        if (key == "tags") {
          imageData[key].forEach(tag => {
            if (tag == '') {
              return;
            }
          });
        } else {
          if (imageData[key] === '') {
            return;
          }
        }
      }

      imagesRef.child(imageKey).set(imageData);

      this.resetAddEditModalData();
      this.toggleAddEditModal();
    },

    deleteImage(image) {
      imagesRef.child(image['.key']).remove();
      this.showDeleteModal = false;
      this.showAddModal = false;
    },

    startMasonry() {
      this.masonry = new Masonry('#masonry', {});
      imagesLoaded(document.querySelectorAll('.item'), instance => {
        this.imagesLoaded = true;
        this.reloadMasonry();
      });
    },

    reloadMasonry() {
      Vue.nextTick(() => {
        if (this.masonry != '') {
          this.masonry.reloadItems();
          this.masonry.layout();
        }
      });
    } } });