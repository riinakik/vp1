const express = require("express");
const router = express.Router(); //suur "R" on oluline!
const general = require("../generalFnc");
const multer = require("multer");
const upload = multer({dest: "../public/gallery/orig/"});
const bodyparser = require("body-parser"); 
//kõikidele marsruutidele ühine vahevara

router.use(general.checkLogin);
router.use(bodyparser.urlencoded({extended: true}));


const {
	photosHome,
	uploadPhotos,
	uploadingPhotos,
	galleryPhotos,
	galleryPage} = require("../controllers/photosControllers");


// igale marsruudile oma osa nagu seni index failis

//app.get("/photos", (req, res)=>{
router.route("/").get(photosHome);

router.route("/photoupload").get(uploadPhotos);

router.route("/photoupload").post(upload.single("photoInput"), uploadingPhotos);

router.route("/gallery").get(galleryPhotos);
router.route("/gallery/:page").get(galleryPage);

module.exports = router;