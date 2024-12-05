const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config.js");
const sharp = require("sharp");
const fs = require("fs");
const async = require("async");

const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

// photos
const photosHome = (req, res)=>{
	console.log("Töötab fotode router koos kontrolleriga");
	res.render("photos");
};


// /photos/photoupload
const uploadPhotos = (req, res) => { 
    res.render("photoupload", { notice: "", userName: req.session.firstName + " " + req.session.lastName });
};

// /photos/photoupload
const uploadingPhotos = (req, res) => {
	console.log(req.body);
	console.log(req.file);
	
	// Kontrolli, kas fail on tõeliselt olemas
    if (!req.file) {
        return res.render("photoupload", { notice: "Pilt on valimata!" });
    }
	
	//teeme oma faili nime
	const fileName ="vp_" + Date.now() + ".jpg";
	//nimetame üleslaetud faili ümber
	fs.rename(req.file.path, req.file.destination + fileName, (err)=>{
		console.log(err);
	});
	//teeme 2 eri suurust
	sharp(req.file.destination + fileName).resize(800,600).jpeg({quality: 90}).toFile("./public/gallery/normal/" + fileName);
	sharp(req.file.destination + fileName).resize(100,100).jpeg({quality: 90}).toFile("./public/gallery/thumb/" + fileName);
	//salvestame andmebaasi
	let sqlReq = "INSERT INTO photos (file_name, orig_name, alt_text, privacy, user_id) VALUES(?,?,?,?,?)";
	const userId = req.session.userId;
	conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId], (err, result)=>{
		if (err){
			throw err;
		}
		else{
			notice = "Pilt on andmebaasi edukalt lisatud!";
			res.render("photoupload", {notice});
		}		
	});	
};

const galleryPhotos =(req, res) => {  
	res.redirect("/photos/gallery/1");

};

// photos/gallery
const galleryPage = (req, res) => { 
	let galleryLinks ="";
	let page = parseInt(req.params.page);
	if (page < 1){
		page = 1;	
	}
	const photoLimit = 1;
	//let skip = 2;
	let skip = 0
	const privacy = 3;
	
	// teeme päringud, mida tuleb kindlalt üksteise järgi teha
	
	const galleryPageTasks = [
		function(callback){
			conn.execute("SELECT COUNT(id) as photoCount FROM photos WHERE privacy = ? AND deleted is NULL", [privacy], (err, result) =>{
				if (err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});	
		},
		function(photoCount, callback){
			console.log("Fotosid on: " + photoCount[0].photos);
			if((page - 1) * photoLimit >= photoCount[0].photos){
				page = Math.ceil(photoCount[0].photos / photoLimit);
			}
			console.log("Lehekülg on: " + page);
			//lingid oleksid
			//<a href="/gallery/1">eelmine leht</a> | <a href="/gallery/3">järgmine leht</a>
			if(page == 1){
				galleryLinks = "eelmine leht &nbsp;&nbsp;&nbsp;| &nbsp;&nbsp;&nbsp;";
			}
			else {
				galleryLinks = '<a href="/photos/gallery/' + (page - 1) + '"> eelmine leht</a> &nbsp;&nbsp;&nbsp;| &nbsp;&nbsp;&nbsp;';
			}
			if(page * photoLimit >= photoCount[0].photos){
				galleryLinks += "järgmine leht";
			}
			else {
				galleryLinks += '<a href="/photos/gallery/' + (page + 1) + '"> järgmine leht</a>';
			}
			return callback(null, page);
		}
	];
	
	// async waterfall
	async.waterfall(galleryPageTasks, (err, results) =>{
		if (err){
			throw err;
		}
		else {
			console.log(results);
		}
	});
	
	//kui aadressis toodud lk on muudetud, oli vigane, siis...
	/* if(page != res.params.page){
		res.redirect("/photos/gallery/" + page);
	} */
	
	skip = (page - 1 * photoLimit);
    let sqlReq = "SELECT file_name, alt_text FROM photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC LIMIT ?,?";
	let photoList = [];
	conn.query(sqlReq, [privacy, skip, photoLimit], (err, result)=>{
		if(err){
			throw err;
		}
		else {
			console.log(result);
			for(let i = 0; i < result.length; i ++) {
				photoList.push({href: "/gallery/thumb/" + result[i].file_name, alt: result[i].alt_text, fileName: result[i].file_name});
			}
			res.render("gallery", {listData: photoList, links : galleryLinks, userName: req.session.firstName + " " + req.session.lastName});
		}
	});
};

module.exports = {
	photosHome,
	uploadPhotos,
	uploadingPhotos,
	galleryPhotos,
	galleryPage
};



