const express = require("express");
const dtEt = require("./dateTime");
const fs = require("fs");
const dbInfo = require("../../vp2024config");
const mysql = require("mysql2");
const bodyparser = require("body-parser");           //päringulahtiharutamiseks POST päringute puhul
const async = require("async");

const app = express();
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(bodyparser.urlencoded({extended: true}));   //päringu urli parsimine, false, kui ainult tekst
//filide üleslaadimiseks
//const multer = require("multer");

//seadistame vahevara multer fotode laadimiseks kindlasse kataloogi
//const upload = multer({dest: "./public/gallery/orig/"});                      SEE OLULINE!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

//pildi manipulatsiooniks, suuruse muutmine
const sharp = require("sharp");

//parooli krüpteerimiseks
const bcrypt = require("bcrypt");
//sessiooni haldur
const session = require("express-session");
app.use(session({secret: "PunaneBanaan", saveUninitialized: true, resave: true}));     //Constant peab olema enne app.use või app.set jne
//loon andmebaasi ühenduse
const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});

const checkLogin = function(req, res, next){
	if(req.session != null){
		if(req.session.userId){
			console.log("Login, sees kasutaja: " + req.session.userId);
			next();
		}
		else{
			console.log("Login not detected");
			res.redirect("/signin");
		}
	}
	else{
		console.log("Session not detected");
		res.redirect("/signin");
	}
};


app.use((req, res, next) => {
    // Kontrollime, kas sessioonis on kasutaja eesnimi ja perekonnanimi
    if (req.session && req.session.firstName && req.session.lastName) {
        // Kui on, siis lisame need `res.locals` objekti, et need oleksid saadaval kõigis EJS lehtedes
        res.locals.userName = req.session.firstName + " " + req.session.lastName;
    }
    next(); // Liigu järgmise päringu töötlemise juurde
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

app.get ("/home", checkLogin, (req,res)=>{
	console.log("Sees on kasutaja: " + req.session.userId);
	res.render("home", {userName: req.session.firstName + " " + req.session.lastName});
});

app.post("/signin", (req, res) => {

	let notice = "";
	if(!req.body.emailInput || !req.body.passwordInput){
		console.log("Andmeid puudu");
		notice = "Sisselogimise andmeid on puudu";
		res.render("signin", { notice: notice });
	} else {
		let sqlReq = "SELECT id, first_name, last_name, password FROM users WHERE email = ?";
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
								//notice = "Oled sisse loginud!";
								//res.render("signin", { notice: notice });
								req.session.userId = result[0].id;
								req.session.firstName = result[0].first_name; // Eesnimi
								req.session.lastName = result[0].last_name; // Perekonnanimi
								res.redirect("/home");
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

app.get("/logout", (req,res)=>{
	req.session.destroy();
	console.log("Välja logitud");
	res.redirect("/");
});

app.get("/signup", (req, res) => {
    res.render("signup.ejs", {
        noticeEmail: "",
        firstNameInput: req.query.firstNameInput || "",
        lastNameInput: req.query.lastNameInput || "",
        birthDateInput: req.query.birthDateInput || "",
        emailInput: req.query.emailInput || "",
		genderInput: req.query.genderInput || "" 
    });
});

app.post("/signup", (req, res) => {
	let notice = "Ootan andmeid";
	let noticeEmail = "";
    console.log(req.body);
    if (
        !req.body.firstNameInput || !req.body.lastNameInput || !req.body.birthDateInput || !req.body.genderInput || !req.body.emailInput ||
        req.body.passwordInput.length < 8 || req.body.passwordInput !== req.body.confirmPasswordInput) {
        console.log("Andmeid on puudu või paroolid ei kattu");
        notice = "Andmeid on puudu, parool liiga lühike või paroolid ei kattu";
        res.render("signup", {  notice: notice, 
                                noticeEmail: noticeEmail, 
                                firstNameInput: req.body.firstNameInput,
                                lastNameInput: req.body.lastNameInput,
                                birthDateInput: req.body.birthDateInput,
                                emailInput: req.body.emailInput,
								genderInput: req.body.genderInput });
        return; // Tagasi, kui andmed on vigased
	}

    let sqlReq = "SELECT * FROM users WHERE email =?";
    conn.execute(sqlReq, [req.body.emailInput], (err, result) => {
    if (err) {
        console.log("Viga andmebaasis emaili kontrollimisel: " + err);
        noticeEmail = "viga andmebaasis emaili kontrollimisel";
        res.render("signup", { notice: notice, 
                               noticeEmail: noticeEmail, 
                               firstNameInput: req.body.firstNameInput,
                               lastNameInput: req.body.lastNameInput,
                               birthDateInput: req.body.birthDateInput,
                               emailInput: req.body.emailInput,
							   genderInput: req.body.genderInput });
        return; // Tagasi, kui andmebaasi viga ilmneb
	}

	if (result.length > 0) {
		console.log("Selline kasutaja on juba olemas!");
		noticeEmail = "Selline kasutaja on juba olemas! Sisselogimine ebaõnnestus";
		res.render("signup", {  notice: notice, 
                                noticeEmail: noticeEmail, 
								firstNameInput: req.body.firstNameInput,
                                lastNameInput: req.body.lastNameInput,
                                birthDateInput: req.body.birthDateInput,
                                emailInput: req.body.emailInput, 
								genderInput: req.body.genderInput });
		} else {
            notice = "Andmed sisestatud";
            // loome parooli räsi jaoks soola
            bcrypt.genSalt(10, (err, salt) => {
                if (err) {
                    notice = "Tehniline viga parooli krüpteerimisel, kasutajat ei loodud";
                    res.render("signup", {  notice: notice, 
											noticeEmail: noticeEmail, 
											firstNameInput: req.body.firstNameInput,
											lastNameInput: req.body.lastNameInput,
											birthDateInput: req.body.birthDateInput,
											emailInput: req.body.emailInput,
											genderInput: req.body.genderInput }); // kui ebaõnnestub ei lähe edasi!
                    return;
					} else {
                    // krüpteerime
                    bcrypt.hash(req.body.passwordInput, salt, (err, pwdHash) => {
                        if (err) {
                            notice = "Tehniline viga, kasutajat ei loodud";
                            res.render("signup", {  notice: notice, 
													noticeEmail: noticeEmail, 
													firstNameInput: req.body.firstNameInput,
													lastNameInput: req.body.lastNameInput,
													birthDateInput: req.body.birthDateInput,
													emailInput: req.body.emailInput,
													genderInput: req.body.genderInput }); // kui ebaõnnestub ei lähe edasi!
                        } else {
                            let sqlReq = "INSERT INTO users (first_name, last_name, birth_date, gender, email, password) VALUES (?,?,?,?,?,?)";
                            conn.execute(sqlReq,[req.body.firstNameInput, req.body.lastNameInput, req.body.birthDateInput, req.body.genderInput, 
								req.body.emailInput, pwdHash], (err, result) => {
                                    if (err) {
                                        notice = "Tehniline viga andmebaasi kirjutamisel, kasutajat ei loodud";
                                        res.render("signup", { notice: notice, 
															   noticeEmail: noticeEmail, 
														       firstNameInput: req.body.firstNameInput,
                                                               lastNameInput: req.body.lastNameInput,
                                                               birthDateInput: req.body.birthDateInput,
                                                               emailInput: req.body.emailInput,
															   genderInput: req.body.genderInput });
                                    } else {
                                        notice = "Kasutaja " + req.body.emailInput + " edukalt loodud!";
                                        res.render("signup", {  notice: notice, 
																noticeEmail: noticeEmail, 
																firstNameInput: req.body.firstNameInput,
																lastNameInput: req.body.lastNameInput,
																birthDateInput: req.body.birthDateInput,
																emailInput: req.body.emailInput, 
																genderInput: req.body.genderInput });
                                    }
                                }
                            ); // conn.execute lõpp
                        }
                    });
                    // hash lõppeb
                }
            }); // genSalt lõppeb
        }
    }); // conn.execute lõpp
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
	res.render ("regvisit", {userName: req.session.firstName + " " + req.session.lastName});
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



app.get("/regvisitdb", checkLogin, (req, res)=>{                             //NÄITA ANDMEBAASI NIME SISESTAMISE LEHTE
	let notice = "";
	let firstName = "";
	let lastName = "";
	res.render ("regvisitdb", {notice: notice, firstName: firstName, lastName: lastName});
});

app.post("/regvisitdb", checkLogin, (req, res)=>{                            //SISESTA OMA NIMI ANDMEBAASI
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

app.get("/eestifilm", checkLogin, (req, res)=>{                                //NÄITA EESTIFILM LEHTE
	res.render ("filmindex", {userName: req.session.firstName + " " + req.session.lastName});
});

app.get("/eestifilm/tegelased", checkLogin, (req, res)=>{                      // NÄITA FILMITEGELASTE LISTI ANDMEBAASIST
	let sqlReq = "SELECT first_name, last_name, birth_date FROM person";
	let persons = [];
	conn.query(sqlReq, (err, sqlres)=>{
		if(err){
			throw err;
		}
		else {
			console.log(sqlres);
			persons = sqlres;
			res.render("tegelased", {persons: persons, userName: req.session.firstName + " " + req.session.lastName});
		}
	});	
});

app.get("/eestifilm/lisaseos", (req, res)=>{   
    //võtan kasutusele asünk mooduli, et korraga teha mitu andmebaasi päringut
	const filmQueries = [
		function(callback){
			let sqlReq1 = "SELECT id, first_name, last_name, birth_date FROM person";
			conn.execute(sqlReq1, (err, result)=> {
				if(err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});
		},
		function(callback){
			let sqlReq2 = "SELECT id, title, production_year FROM movie";
			conn.execute(sqlReq2, (err, result)=> {
				if(err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});
		},
		function(callback){
			let sqlReq3 = "SELECT id, position_name FROM position";
			conn.execute(sqlReq3, (err, result)=> {
				if(err){
					return callback(err);
				}
				else{
					return callback(null, result);
				}
			});
		}
	];
	//paneme need päringud e funktsioonid paralleelselt käima, tulemuseks saame kolme päringu koondi
	async.parallel(filmQueries, (err, results)=>{
		if(err){
			throw err;
		}
		else{
			console.log(results);
			res.render ("addRelations", {personList: results[0], movieList: results[1], positionList: results[2]});
		}
	});
	//res.render ("addRelations");
});

app.post("/eestifilm/lisaseos", (req, res) => {
    const personId = req.body.personSelect;
    const movieId = req.body.movieSelect;
    const positionId = req.body.positionSelect;
    const role = req.body.roleInput || null;  
    const notice = "Seos salvestatud edukalt!";

    // Kontrollime, et kõik vajalikud andmed on esitatud
    if (!personId || !movieId || !positionId) {
        return res.send("Viga: kõik andmed pole sisestatud!");
    }

    // SQL-päring seose lisamiseks
    let sqlReq = "INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES (?, ?, ?, ?)";
    conn.query(sqlReq, [personId, movieId, positionId, role], (err, result) => {
        if (err) {
            console.error("Viga andmete lisamisel:", err);
            throw err;
        } else {
            console.log("Seos salvestatud: ", result.insertId);

            // Andmete uuendamine enne renderdamist
            const sqlPersons = "SELECT id, first_name, last_name, birth_date FROM person";
            const sqlMovies = "SELECT id, title, production_year FROM movie";
            const sqlPositions = "SELECT id, position_name FROM position";

            // Laeme vajalikud andmed andmebaasist
            conn.query(sqlPersons, (err, person) => {
                if (err) {
                    console.error("Viga person andmete laadimisel:", err);
                    throw err;
                }
                console.log("Person andmed:", person);

                conn.query(sqlMovies, (err, movie) => {
                    if (err) {
                        console.error("Viga movie andmete laadimisel:", err);
                        throw err;
                    }
                    console.log("Movie andmed:", movie);

                    conn.query(sqlPositions, (err, position) => {
                        if (err) {
                            console.error("Viga position andmete laadimisel:", err);
                            throw err;
                        }
                        console.log("Position andmed:", position);

                        // Renderime uuendatud andmetega
                        res.render("addRelations", {
                            notice: notice,
                            personList: person || [],
                            movieList: movie || [],
                            positionList: position || []
                        });
                    });
                });
            });
        }
    });
});


/* app.post("/eestifilm/lisaseos", (req, res) => {
	const personId = req.body.personSelect;
    const movieId = req.body.movieSelect;
    const positionId = req.body.positionSelect;
    const role = req.body.roleInput || null;  
    const notice = "Seos salvestatud edukalt!";  

    
    if (!personId || !movieId || !positionId) {
        return res.send("Viga: kõik andmed pole sisestatud!");
    }

 
    let sqlReq = "INSERT INTO person_in_movie (person_id, movie_id, position_id, role) VALUES (?, ?, ?, ?)";
    conn.query(sqlReq, [personId, movieId, positionId, role], (err, result) => {
        if (err) {
            throw err;
        } else {
            console.log("Seos salvestatud: ", result.insertId);

           
            res.render("addRelations", {
                notice: notice,
                personList: req.session.personList,
                movieList: req.session.movieList,
                positionList: req.session.positionList
            });
        }
    });
}); */


app.get("/submitdb", checkLogin, (req, res) => {
  res.render("submitdb", { personNotice: "", filmNotice: "", roleNotice: "", firstName: "", lastName: "", birthDate: "", 
    title: "", productionYear: "", duration: "", description: "", positionName: "", roleDescription: "", userName: req.session.firstName + " " + req.session.lastName });
});

app.post("/submitdb", checkLogin, (req, res) => {
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

//uudiste osa eraldi marsruutide failiga

const newsRouter = require("./routes/newsRoutes");
app.use("/news", newsRouter);

const photosRouter = require("./routes/photosRoutes");
app.use("/photos", photosRouter); 

//galerii osa eraldi marsruutide failiga
/* const galleryRouter = require("./routes/galleryRoutes");
app.use("/gallery", galleryRouter);
 */

/* app.get("/photos", checkLogin, (req, res) => {
    res.render("photos", { userName: req.session.firstName + " " + req.session.lastName });
});

app.get("/photos/photoupload", checkLogin, (req, res)=>{                                
	res.render("photoupload", { notice: "", userName: req.session.firstName + " " + req.session.lastName });
});

app.post("/photos/photoupload", checkLogin, upload.single("photoInput"), (req, res)=>{
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
});

app.get("/photos/gallery", checkLogin, (req, res)=>{
	let sqlReq = "SELECT file_name, alt_text FROM photos WHERE privacy = ? AND deleted IS NULL ORDER BY id DESC";
	const privacy = 3;
	let photoList = [];
	conn.query(sqlReq, [privacy], (err, result)=>{
		if(err){
			throw err;
		}
		else {
			console.log(result);
			for(let i = 0; i < result.length; i ++) {
				photoList.push({href: "/gallery/thumb/" + result[i].file_name, alt: result[i].alt_text, fileName: result[i].file_name});
			}
			res.render("gallery", {listData: photoList, userName: req.session.firstName + " " + req.session.lastName});
		}
	});
});                */     

app.listen(5113);