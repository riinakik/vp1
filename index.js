const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
const bodyparser = require("body-parser");           //päringulahtiharutamiseks POST päringute puhul

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended: true}));   //päringu urli parsimine, false, kui ainult tekst
//filide üleslaadimiseks
const multer = require("multer");

//seadistame vahevara multer fotode laadimiseks kindlasse kataloogi
const upload = multer({dest: "./public/gallery/orig/"});

//pildi manipulatsiooniks, suuruse muutmine
const sharp = require("sharp");

//parooli krüpteerimiseks
const bcrypt = require("bcrypt");

//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

app.get("/", (req, res) => {
    const semStartDate = new Date("2024-09-02");
    const today = new Date();
    const timeDifference = today - semStartDate;
    const dateDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    console.log(`time dif: ${timeDifference}\ndate dif: ${dateDifference}`);

    const sqlReq = "SELECT news_title, news_text, news_date FROM uudised WHERE expire_date >= ? ORDER BY id DESC LIMIT 1"; 

    conn.query(sqlReq, [today.toISOString().split('T')[0]], (err, results) => {
        if (err) {
            throw err;
        }
        console.log(results);

        // Format the news date in the desired format
        if (results.length > 0) {
            const dbDate = new Date(results[0].news_date);
            const day = String(dbDate.getDate()).padStart(2, '0');
            const month = dbDate.toLocaleString('et-EE', { month: 'long' });
            const year = dbDate.getFullYear();
            
            // Set the formatted date
            results[0].news_date = `${day}. ${month} ${year}`;
        }

        // Pass both dateDifference and the news data to EJS
        res.render("index.ejs", { dateDifference: dateDifference, news: results[0] });
    });
});

app.get ("/signin", (req,res)=>{
	
	res.render("signin");
	
});


app.post("/signin", (req, res) => {

	let notice = "";
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log("Andmeid puudu");
		notice = "Sisselogimise andmeid on puudu";
		res.render("signin", { notice: notice });
	} else {
		let sqlReq = "SELECT id, password FROM users WHERE email = ?";
		conn.execute(sqlReq, [req.body.emailInput], (err, result) => {
			if (err) {
				console.log("Viga andmebaasist lugemisel!" + err);
				notice = "Tehinline viga! Sisselogimine ebaõnnestus";
				res.render("signin", { notice: notice });
			} else {
				if (result[0] != null) {
					bcrypt.compare(req.body.passwordInput, result[0].password, (err, compareresult) => {
						if (err) {
							notice = "Tehinline viga! Sisselogimine ebaõnnestus";
							res.render("signin", { notice: notice });
						} else {
							// Kas õige või vale parool
							if (compareresult) {
								notice = "Oled sisse loginud!";
								res.render("signin", { notice: notice });
							} else {
								notice = "Kasutajatunnus ja/voi parool pn vale!";
								res.render("signin", { notice: notice });
							}
						}
					});
				} else {
					notice = "Kasutajatunnus ja/voi parool pn vale!";
					res.render("signin", { notice: notice });
				}
			}
		});
	}
   // Sulg, mis sulgeb conn.query funktsiooni
});  // Sulg, mis sulgeb app.post funktsiooni


app.get("/signup", (req, res)=>{                   
	res.render("signup.ejs");
});

app.post("/signup", (req, res)=>{
	let notice = "Ootan andmeid";
	console.log(req.body);
	if(!req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput || req.body.passwordInput.length < 8 ||
	req.body.passwordInput !== req.body.confirmPasswordInput){
		console.log("Andmeid on puudu või paroolid ei kattu");
		notice = "Andmeid on puudu, parool liiga lühike või paroolid ei kattu";
		res.render("signup", {notice: notice});
	} // Kui andmetes viga ...osa lõppeb
	else{
		notice ="Andmed sisestatud";
		//loome parooli räsi jaoks soola
		bcrypt.genSalt(10, (err, salt)=> {
			if(err){
				notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud";
				res.render("signup", {notice: notice}); // kui ebaõnnestub ei lähe edasi!
			}
			else{
				//krüpteerime
				bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash)=>{
					if(err){
						notice = "Tehniline viga, kasutajat ei loodud";
						res.render("signup", {notice: notice}); // kui ebaõnnestub ei lähe edasi!
					}
					else{
						let sqlReq = "INSERT INTO users (first_name, last_name, birth_date, gender, email, password) VALUES (?,?,?,?,?,?)";
						conn.execute(sqlReq, [req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, req.body.emailInput, pwdHash], 
						(err, result)=>{
							if(err){
								notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud";
								res.render("signup", {notice: notice});
							}
							else{
								notice = "Kasutaja" + " " + req.body.emailInput + "edukalt loodud!";
								res.render("signup", {notice: notice});
							}
							
						}); //conn.execute lõpp
						
					}
				});
				//hash lõppeb
			}
		}); //genSalt lõppeb
		
		
	}// kui andmed korras
	//res.render("signup.ejs");
});


app.get("/vanasonad", (req, res)=>{                   //VANASONAD
	res.render("index.ejs");
});

app.get("/timenow",(req, res)=>{                      //NÄITA TIMENOW LEHTE
	const weekdayNow = dtEt.dayEt();
	const dateNow = dtEt.dateEt();
	const timeNow = dtEt.hoursEt();
	res.render("timenow", {nowWD: weekdayNow, nowD: dateNow, nowT: timeNow});	
});

app.get("/justlist", (req, res)=>{                    //NÄITA VANASÕNADE LEHTE
	let folkwisdom = [];
	fs.readFile("public/textfiles/vanasonad.txt", "utf8", (err, data)=> {
		if (err){
			//throw err;
			res.render("justlist", {h2: "Vanasõnad", listData: ["Ei leidnud ühtegi vanasõna!"]});
		}
		else{
			folkwisdom = data.split(";");
			res.render("justlist", {h2: "Vanasõnad", listData: folkwisdom});
		}	
	});
});

app.get("/regvisit", (req, res)=>{             //NÄITA PANE OMA NIMI KIRJA
	res.render ("regvisit");
});

app.post("/regvisit", (req, res)=>{            //LISA TEKSTIFAILI OMA NIMI
	console.log(req.body);
	
	
    const currentDateTime = new Date().toLocaleString('et-EE', {  // LISA KUUPÄEV JA AEG
        timeZone: 'Europe/Tallinn', 
    });
	
	
	fs.open("public/textfiles/visitlog.txt", "a", (err, file)=> {
		if (err){
			throw err;
		}
		else{
			fs.appendFile("public/textfiles/visitlog.txt", req.body.firstNameInput + " " + req.body.lastNameInput + ";" + " " + currentDateTime + "\n", (err)=> { 
			 if (err){
				 throw err;
			 }
			 else{
				 console.log("Faili kirjutati!");
				 res.render("regvisit");
				 
			 }
		  });	
		}
	});	
});

app.get("/logvisit", (req, res) => {                                 // NÄITA LEHEL KÜLASTUSTE INFOT
    fs.readFile("public/textfiles/visitlog.txt", "utf8", (err, data) => {
        if (err) {
            res.render("logvisit", { h2: "Külastajate nimekiri", listData: ["Ei leidnud ühtegi külastust!"] });
        } else {
            const visitData = data.split('\n').filter(Boolean);      // Filter empty entries
            res.render("logvisit", {listData: visitData});
        }
    });
});



app.get("/regvisitdb", (req, res)=>{                             //NÄITA ANDMEBAASI NIME SISESTAMISE LEHTE
	let notice = "";
	let firstName = "";
	let lastName = "";
	res.render ("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", (req, res)=>{                            //SISESTA OMA NIMI ANDMEBAASI
	let notice = "";
	let firstName = "";
	let lastName = "";
	if(!req.body.firstNameInput || !req.body.lastNameInput){
		firstName = req.body.firstNameInput;
		lastName = req.body.lastNameInput;
		notice = "Osa andmeid sisestamata!";
		res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
	}
	else{
		let sqlreq = "INSERT INTO visitlog (first_name, last_name) VALUES(?,?)";
		conn.query(sqlreq, [req.body.firstNameInput, req.body.lastNameInput], (err,
		sqlres)=>{
			if (err){
				throw err;
			}
			else {
				notice = "Külastus registreeritud";
				res.render("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
			}
	});
	}
});

app.get("/logvisitdb", (req, res)=>{                                 //NÄITA ANNDBEBAASI SISESTATUD NIMEDE LOGI
	let sqlReq = "SELECT first_name, last_name, visit_time FROM visitlog";
	let visits = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			visits = sqlres;
			res.render("logvisitdb", {visits: visits});
		}
	});	
});

app.get("/eestifilm", (req, res)=>{                                //NÄITA EESTIFILM LEHTE
	res.render ("filmindex");
});

app.get("/eestifilm/tegelased", (req, res)=>{                      // NÄITA FILMITEGELASTE LISTI ANDMEBAASIST
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
	let persons = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			persons = sqlres;
			res.render("tegelased", {persons: persons});
		}
	});	
});


app.get("/submitdb", (req, res) => {
  res.render("submitdb", { personNotice: "", filmNotice: "", roleNotice: "", firstName: "", lastName: "", birthDate: "", 
    title: "", productionYear: "", duration: "", description: "", positionName: "", roleDescription: "" });
});

app.post("/submitdb", (req, res) => {
    let personNotice = "";
    let filmNotice = ""; 
    let roleNotice = "";

    if (req.body.personSubmit) {
        let firstName = req.body.firstNameInput;
        let lastName = req.body.lastNameInput;
        let birthDate = req.body.birthDateInput;

        if (!firstName || !lastName || !birthDate) {
            personNotice = "Palun täida kõik isiku väljad!";
            return res.render("submitdb", { personNotice, filmNotice, roleNotice, firstName, lastName, birthDate });
        } 
        let sqlreq = "INSERT INTO person (first_name, last_name, birth_date) VALUES(?,?,?)";
        conn.query(sqlreq, [firstName, lastName, birthDate], (err, sqlres) => {
            if (err) {
                throw err;
            } 
            personNotice = "Isik salvestatud";
            return res.render("submitdb", { personNotice, filmNotice, roleNotice, firstName, lastName, birthDate });
        });

    } else if (req.body.filmSubmit) {
        let title = req.body.titleInput;
        let productionYear = req.body.productionYearInput;
        let duration = req.body.durationInput;
        let description = req.body.descriptionInput;

        if (!title || !productionYear || !duration || !description) {
            filmNotice = "Palun täida kõik filmi väljad!";
            return res.render("submitdb", { personNotice, filmNotice, roleNotice, title, productionYear, duration, description });
        } 
        let sqlreq = "INSERT INTO movie (title, production_year, duration, description) VALUES(?,?,?,?)";
        conn.query(sqlreq, [title, productionYear, duration, description], (err, sqlres) => {
            if (err) {
                throw err;
            } 
            filmNotice = "Film salvestatud";
            return res.render("submitdb", { personNotice, filmNotice, roleNotice, title, productionYear, duration, description });
        });

    } else if (req.body.roleSubmit) {
        let positionName = req.body.positionNameInput;
        let roleDescription = req.body.roleDescriptionInput;

        if (!positionName || !roleDescription) {
            roleNotice = "Palun täida kõik rolli väljad!";
            return res.render("submitdb", { personNotice, filmNotice, roleNotice, positionName, roleDescription });
        } 
        let sqlreq = "INSERT INTO `position` (position_name, description) VALUES(?,?)";
        conn.query(sqlreq, [positionName, roleDescription], (err, sqlres) => {
            if (err) {
                throw err;
            } 
            roleNotice = "Roll salvestatud";
            return res.render("submitdb", { personNotice, filmNotice, roleNotice, positionName, roleDescription });
        });
    } else {
        // Kui ei ühtegi nuppu vajutatud, renderdame lehe vaikeseadistustega
        return res.render("submitdb", { personNotice, filmNotice, roleNotice });
    }
});

app.get("/addnews", (req, res) => { 
    // Määrame vaikimisi aegumiskuupäeva 10 päeva pärast
    const today = new Date();
    const expDateO = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
    const expDate = expDateO.toISOString().split('T')[0]; // YYYY-MM-DD

   res.render("addnews", { notice: "", titleNotice: "", newsNotice: "", title: "", news: "", expire: "", expDate });
});

app.post("/addnews", (req, res) => {
    let notice = "";
	let titleNotice = "";
	let newsNotice = "";
    let title = req.body.titleInput;
    let news = req.body.newsInput;
    let expire = req.body.expireInput;

    // Kui kuupäeva pole määratud, määrame vaikimisi 10 päeva hilisema kuupäeva
    const today = new Date();
    const expDateO = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
    const expDate = expDateO.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!title || !news || !expire) {
        notice = "Osa andmeid sisestamata!";
	}
	if (title.length < 3 && title.length !== 0) {
		titleNotice = "Pealkiri peab olema vähemalt 3 tähemärki pikk!";
	}
	if (news.length < 10 && news.length !== 0) {
		newsNotice = "Sisu peab olema vähemalt 10 tähemärki pikk!";
	}
	if (notice || titleNotice || newsNotice) {
        res.render("addnews", { notice, titleNotice, newsNotice, title, news, expire, expDate });	
	}else {
        let sqlreq = "INSERT INTO uudised (news_title, news_text, news_date, expire_date, user_id) VALUES (?, ?, current_timestamp(), ?, 1)";
        
        console.log("Sisestatud väärtused:", title, news, expire);
        conn.query(sqlreq, [title, news, expire], (err, sqlres) => {
            if (err) {
                throw err;
            } else {
                notice = "Uudis registreeritud!";
                // Lähtestame väljad pärast edukat registreerimist
                res.render("addnews", { notice, titleNotice, newsNotice, title, news, expire, expDate });
            }
        });
    }
});

app.get("/shownews", (req, res) => {  
    const today = new Date().toISOString().split('T')[0]; 

    let sqlReq = "SELECT news_title, news_text, news_date FROM uudised WHERE expire_date >= ? ORDER BY id DESC";

    conn.query(sqlReq, [today], (err, results) => {
        if (err) {
            throw err;
        } else {
            // Format each news date in the results
            results = results.map(item => {
                const dbDate = new Date(item.news_date);
                const day = String(dbDate.getDate()).padStart(2, '0');
                const month = dbDate.toLocaleString('et-EE', { month: 'long' });
                const year = dbDate.getFullYear();
                
                // Set the formatted date
                item.news_date = `${day}. ${month} ${year}`;
                return item;
            });

            console.log(results); // See peaks olema väljaspool .map meetodit
            res.render("shownews", { news: results });
        }
    });
});


app.get("/photoupload", (req, res)=>{                                
	res.render("photoupload", { notice: "" });
});

app.post("/photoupload", upload.single("photoInput"), (req, res)=>{
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
	const userId = 1;
	conn.query(sqlReq, [fileName, req.file.originalname, req.body.altInput, req.body.privacyInput, userId], (err, result)=>{
		if (err){
			throw err;
		}
		else{
			notice = "Pilt on andmebaasi edukalt lisatud!";
			res.render("photoupload", {notice});
		}		
	});	
});

app.get("/gallery", (req, res)=>{      
	let sqlReq = "SELECT file_name, orig_name, alt_text, privacy, user_id FROM photos WHERE privacy = 3 AND deleted IS NULL";
	let pictures = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			pictures = sqlres;
			res.render("gallery", {pictures});
		}
	});	
});                          



app.listen(5113);