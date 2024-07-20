const express = require("express");
const mysql = require('mysql');
const cors = require('cors');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "signup"
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'utsc18156@gmail.com',
        pass: 'u75c!785'
    }
});

const loadTemplate = (token) => {
    const templatePath = path.join(__dirname, 'emailTemplate.html');
    let template = fs.readFileSync(templatePath, 'utf8');
    template = template.replace('{{token}}', token);
    return template;
};

app.post('/signup', (req, res) => {
    const sql = "INSERT INTO login (`name`,`email`,`password`) VALUES (?)";
    const values = [
        req.body.name,
        req.body.email,
        bcrypt.hashSync(req.body.password, 10)
    ];

    db.query(sql, [values], (err, data) => {
        if (err) {
            return res.json("Error");
        }
        return res.json(data);
    });
});

app.post('/login', (req, res) => {
    const sql = "SELECT * FROM login WHERE `email` = ?";

    db.query(sql, [req.body.email], (err, data) => {
        if (err) {
            return res.json("Error");
        }

        if (data.length > 0) {
            const user = data[0];
            if (bcrypt.compareSync(req.body.password, user.password)) {
                return res.json("Success");
            } else {
                return res.json("Fail");
            }
        } else {
            return res.json("Fail");
        }
    });
});

app.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    const sql = "SELECT * FROM login WHERE `email` = ?";

    db.query(sql, [email], (err, data) => {
        if (err) {
            return res.status(500).send("Error");
        }

        if (data.length > 0) {
            const token = jwt.sign({ email }, 'tu_secreto', { expiresIn: '1h' });

            const mailOptions = {
                from: 'utsc18156@gmail.com',
                to: email,
                subject: 'Recuperación de Contraseña',
                html: loadTemplate(token)
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    return res.status(500).send(error.toString());
                }
                res.status(200).send('Correo enviado: ' + info.response);
            });
        } else {
            res.status(404).send("Correo no encontrado");
        }
    });
});

app.post('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
        const decoded = jwt.verify(token, 'tu_secreto');
        const hashedPassword = bcrypt.hashSync(newPassword, 10);

        const sql = "UPDATE login SET `password` = ? WHERE `email` = ?";
        db.query(sql, [hashedPassword, decoded.email], (err, data) => {
            if (err) {
                return res.status(500).send("Error");
            }
            res.status(200).send("Contraseña actualizada");
        });
    } catch (error) {
        res.status(400).send("Token inválido o expirado");
    }
});

app.listen(8081, () => {
    console.log("Listening");
});
