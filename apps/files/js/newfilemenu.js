/*
 * Copyright (c) 2014
 *
 * This file is licensed under the Affero General Public License version 3
 * or later.
 *
 * See the COPYING-README file.
 *
 */

/* global Files */

(function() {
    /*class="displayname">{{uploadLabel}}  upload label nama dari Upload*/
    var TEMPLATE_MENU =
        '<ul>' +
        '<li>' +
        '<label for="file_upload_start" class="menuitem" data-action="upload" title="{{uploadMaxHumanFilesize}}"><span class="svg icon icon-upload"></span><span class="displayname">{{uploadLabel}}</span></label>' +
        '</li>' +
        '{{#each items}}' +
        '<li>' +
        '<a href="#" class="menuitem" data-templatename="{{templateName}}" data-filetype="{{fileType}}" data-action="{{id}}"><span class="icon {{iconClass}} svg"></span><span class="displayname">{{displayName}}</span></a>' +
        '</li>' +
        '{{/each}}' +
        '</ul>';

    var TEMPLATE_FILENAME_FORM =
        '<form class="filenameform">' +
        '<label class="hidden-visually" for="{{cid}}-input-{{fileType}}">{{fileName}}</label>' +
        '<input id="{{cid}}-input-{{fileType}}" type="text" value="{{fileName}}" autocomplete="off" autocapitalize="off">' +
        '</form>';

    /**
     * Construct a new NewFileMenu instance
     * @constructs NewFileMenu
     *
     * @memberof OCA.Files
     */
    var NewFileMenu = OC.Backbone.View.extend({
        tagName: 'div',
        className: 'newFileMenu popovermenu bubble hidden open menu',

        events: {
            'click .menuitem': '_onClickAction'
        },

        /**
         * @type OCA.Files.FileList
         */
        fileList: null,

        initialize: function(options) {
            var self = this;
            var $uploadEl = $('#file_upload_start');
            if ($uploadEl.length) {
                $uploadEl.on('fileuploadstart', function() {
                    self.trigger('actionPerformed', 'upload');
                });
            } else {
                console.warn('Missing upload element "file_upload_start"');
            }

            this.fileList = options && options.fileList;

            this._menuItems = [{
                id: 'folder',
                displayName: t('files', 'Folder'),
                templateName: t('files', 'New folder'),
                iconClass: 'icon-folder',
                fileType: 'folder',
                actionHandler: function(name) {
                    self.fileList.createDirectory(name);
                }
            }];

            OC.Plugins.attach('OCA.Files.NewFileMenu', this);
        },

        template: function(data) {
            if (!OCA.Files.NewFileMenu._TEMPLATE) {
                OCA.Files.NewFileMenu._TEMPLATE = Handlebars.compile(TEMPLATE_MENU);
            }
            return OCA.Files.NewFileMenu._TEMPLATE(data);
        },

        /**
         * Event handler whenever an action has been clicked within the menu
         *
         * @param {Object} event event object
         */
        _onClickAction: function(event) {

            console.log('masuk lagi');

            var $target = $(event.target);
            if (!$target.hasClass('menuitem')) {
                $target = $target.closest('.menuitem');
            }
            var action = $target.attr('data-action');
            // note: clicking the upload label will automatically
            // set the focus on the "file_upload_start" hidden field
            // which itself triggers the upload dialog.
            // Currently the upload logic is still in file-upload.js and filelist.js
            if (action === 'upload') {
                OC.hideMenus();
            } else {
                event.preventDefault();
                this.$el.find('.menuitem.active').removeClass('active');
                $target.addClass('active');
                this._promptFileName($target);
            }
        },

        _promptFileName: function($target) {
            var self = this;
            if (!OCA.Files.NewFileMenu._TEMPLATE_FORM) {
                OCA.Files.NewFileMenu._TEMPLATE_FORM = Handlebars.compile(TEMPLATE_FILENAME_FORM);
            }

            if ($target.find('form').length) {
                $target.find('input').focus();
                return;
            }

            // discard other forms
            this.$el.find('form').remove();
            this.$el.find('.displayname').removeClass('hidden');

            $target.find('.displayname').addClass('hidden');

            var newName = $target.attr('data-templatename');
            var fileType = $target.attr('data-filetype');
            var $form = $(OCA.Files.NewFileMenu._TEMPLATE_FORM({
                fileName: newName,
                cid: this.cid,
                fileType: fileType
            }));

            //this.trigger('actionPerformed', action);
            $target.append($form);

            // here comes the OLD code
            var $input = $form.find('input');

            var lastPos;
            var checkInput = function() {
                var filename = $input.val();
                try {
                    if (!Files.isFileNameValid(filename)) {
                        // Files.isFileNameValid(filename) throws an exception itself
                    } else if (self.fileList.inList(filename)) {
                        throw t('files', '{newname} already exists', { newname: filename });
                    } else {
                        return true;
                    }
                } catch (error) {
                    $input.attr('title', error);
                    $input.tooltip({ placement: 'right', trigger: 'manual' });
                    $input.tooltip('fixTitle');
                    $input.tooltip('show');
                    $input.addClass('error');
                }
                return false;
            };

            // verify filename on typing
            $input.keyup(function() {
                if (checkInput()) {
                    $input.tooltip('hide');
                    $input.removeClass('error');
                }
            });

            $input.focus();
            // pre select name up to the extension
            lastPos = newName.lastIndexOf('.');
            if (lastPos === -1) {
                lastPos = newName.length;
            }
            $input.selectRange(0, lastPos);

            $form.submit(function(event) {
                event.stopPropagation();
                event.preventDefault();

                if (checkInput()) {
                    var newname = $input.val();

                    /* Find the right actionHandler that should be called.
                     * Actions is retrieved by using `actionSpec.id` */
                    action = _.filter(self._menuItems, function(item) {
                        return item.id == $target.attr('data-action');
                    }).pop();
                    action.actionHandler(newname);

                    $form.remove();
                    $target.find('.displayname').removeClass('hidden');
                    OC.hideMenus();
                }
            });
        },

        /**
         * Add a new item menu entry in the “New” file menu (in
         * last position). By clicking on the item, the
         * `actionHandler` function is called.
         *
         * @param {Object} actionSpec item’s properties
         */
        addMenuEntry: function(actionSpec) {
            this._menuItems.push({
                id: actionSpec.id,
                displayName: actionSpec.displayName,
                templateName: actionSpec.templateName,
                iconClass: actionSpec.iconClass,
                fileType: actionSpec.fileType,
                actionHandler: actionSpec.actionHandler,
            });
        },

        /**
         * Renders the menu with the currently set items
         */
        render: function() {
            console.log('masuk menu upload');
            this.$el.html(this.template({
                uploadMaxHumanFileSize: 'TODO',
                uploadLabel: t('files', 'Upload'),
                items: this._menuItems
            }));
            OC.Util.scaleFixForIE8(this.$('.svg'));
        },

        /**
         * Displays the menu under the given element
         *
         * @param {Object} $target target element
         */
        showAt: function($target) {
            this.render();
            var targetOffset = $target.offset();
            this.$el.css({
                left: targetOffset.left,
                top: targetOffset.top + $target.height()
            });
            this.$el.removeClass('hidden');

            OC.showMenu(null, this.$el);
        }
    });

    // function generateToAscii(fileText) {

    //     console.log(fileText); //fileText Asli
    //     let text_arr = fileText.split("");
    //     // console.log(text_arr);		

    //     let i = 0;

    //     textAcsii = [];
    //     text_arr.forEach(function(x) {
    //             index = 0;

    //             textAcsii.push(x.charCodeAt(index));
    //             i++;
    //         })
    //         // console.log(textAcsii);
    //     return textAcsii;
    // }

    // function getRandomInt(max) {
    //     return Math.floor(Math.random() * Math.floor(max));
    // }

    // function primeNumberGenerator() {
    //     // console.log("primeNumberGenerator Start");
    //     var num = 0;
    //     rand = getRandomInt(20); ///
    //     num = rand + 1;
    //     // console.log(num); //nomor random

    //     for (var i = 1; i < 10; i++) {


    //         if (isPrime(num) == false) {

    //             num = num + 1;
    //         } else {
    //             // console.log(num+"fix");
    //             return num;
    //         }

    //         // console.log(num+"up");
    //     }
    // }

    // function isPrime(inputNum) {

    //     for (var i = 2; i < inputNum; i++) {
    //         if (inputNum % i == 0) {
    //             // console.log(inputNum);
    //             return false;
    //         }
    //     }
    //     // console.log(inputNum>1); //mendapatkan nilai true
    //     return inputNum > 1;
    // }

    // function cekGCD(a, b) {
    //     if (b == 0) return a;
    //     return cekGCD(b, a % b);
    // }


    // function mulaiRSA(key) {


    //     let keyA = key;

    //     let keyAscii = generateToAscii(keyA);


    //     // text to ascii
    //     console.log(keyAscii);

    //     //mendapatkan nilai p & q
    //     let p = primeNumberGenerator();
    //     do {
    //         q = primeNumberGenerator();
    //     } while (p == q);
    //     console.log("number p " + p);
    //     np.html("p =" + p);
    //     console.log("number q " + q);
    //     nq.html("q =" + q);

    //     //mendapatkan nilai n
    //     let n = p * q;
    //     console.log("number n " + n);
    //     nn.html("n =" + n);
    //     nn.attr("n", n);

    //     //mendapatkan nilai phi
    //     let m = (p - 1) * (q - 1);
    //     console.log("nilai phi " + m);
    //     phi.html("phi =" + m);
    //     phi.attr("phi", m);

    //     // mendapatkan e/publik key dan cek cekGCD
    //     let gcd = 0;
    //     // let e;
    //     do {
    //         e = primeNumberGenerator();
    //         gcd = cekGCD(m, e);
    //     } while (e == 1 || gcd != 1);
    //     console.log("nilai GCD " + gcd);
    //     console.log("publik key/e " + e);
    //     ne.html("publik key/e =" + e);
    //     ne.attr("ne", e);

    //     //mendapatkan d/private key dan cek gcd
    //     var k = 1;
    //     var dsyarat = 0;
    //     do {
    //         d = (1 + (k * m)) / e;
    //         dsyarat = (d * e) % m;
    //         k++;
    //     } while (d % 1 != 0 || dsyarat != 1);

    //     console.log("nilai k " + k);
    //     nk.html("k =" + k);
    //     console.log("nilai dsyarat " + dsyarat);
    //     console.log("nilai d " + d);
    //     nd.html("d =" + d);
    //     let arrayHasil = [];
    //     let arrayTmp = [];
    //     for (var i = 0; i < keyAscii.length; i++) {

    //         console.log(keyAscii[i]);

    //         let res = Math.pow(keyAscii[i], e);
    //         // let hasil = Math.pow(115,13)%95;

    //         let b = bigInt(keyAscii[i]);
    //         let c = bigInt(e);

    //         let a = bigInt(b).pow(c);

    //         console.log(a);
    //         const hasilPertama = bigInt(a).mod(n); //ascii^e mod n

    //         let d = bigInt(hasilPertama).pow(c);
    //         const hasil = bigInt(d).mod(n); //dual RSA
    //         console.log("hasil pangkat e " + BigInt(a));
    //         console.log("hasil modulus n " + hasil);

    //         arrayTmp = hasil.toString(2); // merubah ke biner
    //         console.log("biner asli " + hasil.toString(2));
    //         // console.log(arrayHasil.length);

    //         //hasil biner dirubah ke 8 bit
    //         if (arrayTmp.length != 8) {

    //             delapan = 8 - arrayTmp.length;

    //             // toBiner[i]= toBiner[i]+9999;
    //             console.log("tidak" + delapan);
    //             for (k = 0; k < delapan; k++) {
    //                 arrayTmp = 0 + arrayTmp;
    //             }
    //         }

    //         console.log("biner sudah dirubah ke 8 bit " + arrayTmp);
    //         arrayHasil.push(arrayTmp);


    //     }
    //     console.log(arrayHasil);
    //     // gabung
    //     a = arrayHasil.join("").toString().match(/.{1,6}/g);

    //     console.log(a);
    //     // console.log(arrayHasil.join("").length); 

    //     for (i = 0; i < a.length; i++) {
    //         if (a[i].length != 6) {
    //             var nol = "";
    //             for (b = 0; b < (6 - a[i].length); b++) { nol += "0"; }
    //             console.log(nol);
    //             a[i] = a[i] + nol;
    //         }
    //     }
    //     console.log(a);
    //     for (i = 0; i < a.length; i++) {
    //         a[i] = parseInt(a[i], 2);
    //     }
    //     console.log("hasil2");
    //     console.log(a);
    //     console.log(a.length);

    //     // mendapatkan nilai asscii
    //     ciper.html("ascii =" + a);
    //     ciper.attr("ascii", a);

    //     var base = a;
    //     for (i = 0; i < base.length; i++) {
    //         // console.log(BASE64[base[i]]);
    //         base[i] = BASE64[base[i]];
    //     }
    //     var hasilencri = base + "==";

    //     console.log(hasilencri);

    //     coba = hasilencri.replace(/,/g, "");
    //     console.log(coba);
    //     encry.html("Hasil Encry =  " + coba);
    //     encry.attr("encry", coba);

    // }

    // function getChunks(number, size) {
    //     let str = number.toString(),
    //         length = str.length - size + 1;

    //     return Array.from({ length }, (_, i) => +str.slice(i, i + size))
    // }

    // function selesaiRSA() {
    //     console.log("Masuk metod selesaiRSA");

    //     var encry = $("#encry").attr('encry');
    //     var e = $("#e").attr('ne');
    //     var n = $("#n").attr('n');
    //     var ciper = $("#ciper").attr("ascii");
    //     var phi = $("#phi").attr("phi");
    //     console.log(phi);
    //     console.log(e);
    //     console.log(ciper);
    //     console.log(encry);
    //     console.log(n);

    //     var d = 0;
    //     var k = 1;
    //     var dsyarat = 0;
    //     do {
    //         d = (1 + (k * phi)) / e;
    //         dsyarat = ((d * e) % phi);
    //         k++;
    //     } while (d % 1 != 0 || dsyarat != 1);
    //     console.log("nilai k " + k);
    //     console.log("dSyarat " + dsyarat);
    //     console.log("Nilai D " + d);

    //     // ciper to desimal
    //     console.log(encry);

    //     let toDesimal = encry.split("");
    //     console.log(toDesimal);
    //     var value = "=";
    //     toDesimal = toDesimal.filter(function(item) { //menghapus "="
    //         return item !== value;
    //     })
    //     console.log(toDesimal);
    //     for (i = 0; i < toDesimal.length; i++) {
    //         // console.log("jumlah");
    //         for (j = 0; j < BASE64.length; j++) {
    //             if (BASE64[j] === toDesimal[i]) {
    //                 // console.log(j); 
    //                 toDesimal[i] = j;

    //             }
    //         }
    //     }
    //     console.log(toDesimal);

    //     // Hidup cuma Sekali, jangan kamu isi hanya dengan kekecewaan

    //     //Desimal to biner
    //     let toBiner = [];
    //     for (i = 0; i < toDesimal.length; i++) {
    //         // toDesimal[i]= toDesimal[i].toString(2);
    //         var oi = toDesimal[i];

    //         console.log(oi.toString(2));
    //         toBiner.push(oi.toString(2));
    //     }
    //     console.log(toBiner);
    //     //jadikan biner to 6 bit
    //     for (i = 0; i < toBiner.length; i++) {
    //         if (toBiner[i].length != 6) {
    //             enam = 6 - toBiner[i].length;

    //             // toBiner[i]= toBiner[i]+9999;
    //             console.log("tidak" + enam);
    //             for (j = 0; j < enam; j++) {
    //                 toBiner[i] = 0 + toBiner[i];
    //             }
    //         }
    //     }
    //     console.log(toBiner);

    //     // Biner 6 bit ke 8 bit 

    //     console.log((toBiner.join("").toString().match(/.{1,8}/g)));
    //     let ab = toBiner.join("").toString().match(/.{1,8}/g);

    //     for (i = 0; i < ab.length; i++) {
    //         if (ab[i].length != 8) {
    //             delapan = 8 - ab[i].length;

    //             // toBiner[i]= toBiner[i]+9999;
    //             console.log("tidak" + delapan);
    //             for (j = 0; j < delapan; j++) {
    //                 ab[i] = ab[i] + 0;
    //             }
    //         }
    //     }
    //     console.log(ab);

    //     ac = ab[ab.length - 1];
    //     if (ac === "00000000") { //menghapus array jika array terakhir nilai 0
    //         console.log("masuk sini");
    //         ab.splice(ab.length - 1, 1);
    //     }
    //     // 
    //     console.log("array terakhir " + ac);
    //     console.log(ab);

    //     //biner to desimal
    //     let desimal = [];
    //     for (i = 0; i < ab.length; i++) {
    //         var io = ab[i];
    //         desimal.push(parseInt(io, 2));
    //     }
    //     // console.log(parseInt(ab[0],2))
    //     console.log(desimal);
    //     hasilDecry = [];
    //     for (i = 0; i < desimal.length; i++) {

    //         let private = bigInt(d);

    //         let a = bigInt(desimal[i]).pow(private);

    //         // console.log(a);
    //         hasilPertama = bigInt(a).mod(n); //modulus  desimal^privateKey mod n

    //         let fix = bigInt(hasilPertama).pow(private);
    //         hasil = bigInt(fix).mod(n); //dual RSA

    //         console.log("Hasil = " + hasil);
    //         // hasilDecry.push(BASE64[3]);
    //         hasilDecry.push(hasil + 0);
    //     }

    // console.log(hasilDecry);
    // for (i = 0; i < hasilDecry.length; i++) { //to plainText

    //     hasilDecry[i] = String.fromCharCode(hasilDecry[i]);

    // }

    // ;

    // }
    OCA.Files.NewFileMenu = NewFileMenu;

})();