const mysql = require("mysql2");
const dbInfo = require("../../../vp2024config");

const conn = mysql.createConnection({
	host: dbInfo.configData.host,
	user: dbInfo.configData.user,
	password: dbInfo.configData.passWord,
	database: dbInfo.configData.dataBase
});


//@desc home page for news section
//@route GET /news
//@access private

const newsHome = (req, res)=>{
	console.log("Töötab uudiste router koos kontrolleriga");
	res.render("news");
};

//@desc page for adding news 
//@route GET /news/addnews
//@access private

const addNews = (req, res) => { 
    // Määrame vaikimisi aegumiskuupäeva 10 päeva pärast
    const today = new Date();
    const expDateO = new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000);
    const expDate = expDateO.toISOString().split('T')[0]; // YYYY-MM-DD

   res.render("addnews", { notice: "", titleNotice: "", newsNotice: "", title: "", news: "", expire: "", expDate, userName: req.session.firstName + " " + req.session.lastName });
};

//@desc page for adding news 
//@route GET /news/addnews
//@access private

const addingNews = (req, res) => {
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
		
		const userId = req.session.userId;

		let sqlreq = "INSERT INTO uudised (news_title, news_text, news_date, expire_date, user_id) VALUES (?, ?, current_timestamp(), ?, ?)";

        console.log("Sisestatud väärtused:", title, news, expire);
        conn.query(sqlreq, [title, news, expire, userId], (err, sqlres) => {
            if (err) {
                throw err;
            } else {
                notice = "Uudis registreeritud!";
                // Lähtestame väljad pärast edukat registreerimist
                res.render("addnews", { notice, titleNotice, newsNotice, title, news, expire, expDate });
            }
        });
    }
};

//@desc page for reading news 
//@route GET /news/shownews
//@access private

const newsHeadings = (req, res) => {  
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
            res.render("shownews", { news: results, userName: req.session.firstName + " " + req.session.lastName });
        }
    });
};

module.exports = {
	newsHome,
	addNews,
	addingNews,
	newsHeadings
};



