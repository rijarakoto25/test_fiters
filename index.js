//déclaration des modules npm
const express = require("express");
const app = express();
const MongoClient = require("mongodb").MongoClient;
const session = require("express-session");
const bodyParser = require("body-parser");
//session
app.use(
  session({
    secret: "mon texte secret",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));

let textesPug = {};

app.use((req, res, next) => {
  if (!req.session.utilisateur) {
    req.session.utilisateur = {};
  }

  if (!app.locals.message) {
    app.locals.message = {};
  }

  textesPug.message = app.locals.message;
  app.locals.message = {};

  textesPug.utilisateur = req.session.utilisateur;
  next();
});
//déclaration des fichiers statiques
app.set("view engine", "pug");
app.use("/css", express.static(__dirname + "/assets/css"));
app.use("/js", express.static(__dirname + "/assets/js"));
//Appel de mongodb
const urlDB = "mongodb://localhost:27017";
const nameDb = "un-blog";
//page d'accueil principale
app.get("/", (req, res, next) => {
  textesPug.titre = `Page d'accueil`;
  res.render("accueil", textesPug);
});
//connecter
app.get("/connecter", (req, res, next) => {
  textesPug.titre = `Se connecter`;
  res.render("connection", textesPug);
});
//deconnecter
app.get("/deconnecter", (req, res, next) => {
  req.session.destroy((err) => {
    app.locals.message = { class: "primary", texte: "Vous êtes déconnecté" };
    res.redirect("/");
  });
});
//page d'accueil admin
app.get("/admin/accueil", (req, res, next) => {
  textesPug.titre = `Accueil de l'administration`;
  res.render("admin-accueil", textesPug);
});
//verification de connexion
app.post("/connecter-verif", (req, res, next) => {
  if (!req.body.pseudo || !req.body.mdp) {
    app.locals.message = {
      class: "warning",
      texte: "Pseudo et/ou le mot de passe non fourni(s).",
    };
    res.redirect("/connecter");
  } else {
    MongoClient.connect(urlDB, { useUnifiedTopology: true }, (err, client) => {
      if (err) return;
      const collection = client.db(nameDb).collection("collection");
      collection
        .find({ pseudo: req.body.pseudo, mdp: req.body.mdp })
        .toArray((err, data) => {
          if (data.length) {
            req.session.utilisateur.pseudo = data[0].pseudo;
            req.session.utilisateur.niveau = data[0].niveau;
            textesPug.utilisateur = req.session.utilisateur;
            textesPug.message = {
              class: "success",
              texte: "Vous êtes bien connecté",
            };
            textesPug.titre = `Accueil de l'administration`;
            res.render("admin-accueil", textesPug);
          } else {
            app.locals.message = {
              class: "danger",
              texte: "Pseudo et/ou le mot de passe incorrect(s).",
            };
            res.redirect("/connecter");
          }
        });
    });
  }
});
//root ajout d'utilisateur
app.get("/admin/ajout-utilisateur", (req, res, next) => {
  textesPug.titre = "Ajouter un utilisateur";
  res.render("admin-ajout-utilisateur", textesPug);
});
//verification du niveau (droit) de l'utilisateur
app.post("/admin/ajout-utilisateur-verif", (req, res, next) => {
  const niveau = parseInt(req.body.niveau);
  if (!req.body.pseudo || !req.body.mdp || [1, 5, 10].indexOf(niveau) == -1) {
    app.locals.message = {
      class: "warning",
      texte: "Il manque des informations.",
    };
    res.redirect("/admin/ajout-utilisateur");
  } else {
    MongoClient.connect(urlDB, { useUnifiedTopology: true }, (err, client) => {
      if (err) return;
      const collection = client.db(nameDb).collection("utilisateurs");
      collection.insertOne(
        {
          pseudo: req.body.pseudo,
          mdp: req.body.mdp,
          niveau: niveau,
          prenom: req.body.prenom,
          nom: req.body.nom,
          rue: req.body.rue,
          cp: req.body.cp,
          ville: req.body.ville,
          telephone: req.body.telephone,
        },
        (err, r) => {
          client.close();
          if (err) {
            app.locals.message = {
              class: "danger",
              texte: `Le nouvel utilisateur n'a pas pu être enregistré.`,
            };
            res.redirect("/admin/ajout-utilisateur");
          } else {
            app.locals.message = {
              class: "success",
              texte: `Le nouvel utilisateur a été enregistré.`,
            };
            res.redirect("/admin/accueil");
          }
        }
      );
    });
  }
});
//root pour voir toute la collection
app.get("/admin/liste-utilisateur", (req, res, next) => {
  MongoClient.connect(urlDB, { useUnifiedTopology: true }, (err, client) => {
    if (err) return;
    const collection = client.db(nameDb).collection("collection");
    collection.find().toArray((err, data) => {
      textesPug.titre = "Liste des utilisateurs";
      textesPug.listeUtilisateurs = data;
      res.render("admin-liste-utilisateurs", textesPug);
    });
  });
});
//root
app.get("/admin/modifier-utilisateur/:pseudo", (req, res, next) => {
  MongoClient.connect(urlDB, { useUnifiedTopology: true }, (err, client) => {
    if (err) return;
    const collection = client.db(nameDb).collection("collection");
    collection.find({ pseudo: req.params.pseudo }).toArray((err, data) => {
      if (data.length) {
        textesPug.titre = `Modifier  ${req.params.pseudo}`;
        textesPug.donneesUtilisateur = data[0];
        res.render("admin-modif-utilisateur", textesPug);
      } else {
        app.locals.message = { class: "danger", texte: `Utilisateur inconnu.` };
        res.redirect("/admin/liste-utilisateur");
      }
    });
  });
});

app.post("/admin/modifier-utilisateur-verif", (req, res, next) => {
  const niveau = parseInt(req.body.niveau);
  if (!req.body.pseudo || !req.body.mdp || [1, 5, 10].indexOf(niveau) == -1) {
    app.locals.message = {
      class: "warning",
      texte: "Il manque des informations.",
    };
    res.redirect("/admin/liste-utilisateur");
  } else {
    MongoClient.connect(urlDB, { useUnifiedTopology: true }, (err, client) => {
      if (err) return;
      const collection = client.db(nameDb).collection("collection");
      collection.find({ pseudo: req.body.pseudo }).toArray((err, data) => {
        if (data.length) {
          collection.updateOne(
            { pseudo: req.body.pseudo },
            {
              $set: {
                pseudo: req.body.pseudo,
                mdp: req.body.mdp,
                niveau: niveau,
                prenom: req.body.prenom,
                nom: req.body.nom,
                rue: req.body.rue,
                cp: req.body.cp,
                ville: req.body.ville,
                telephone: req.body.telephone,
              },
            },
            (err, r) => {
              client.close();
              if (err) {
                app.locals.message = {
                  class: "danger",
                  texte: `L'utilisateur ${req.body.pseudo} n'a pas pu être modifié.`,
                };
                res.redirect("/admin/liste-utilisateur");
              } else {
                app.locals.message = {
                  class: "success",
                  texte: `L'utilisateur ${req.body.pseudo} a pu être modifié.`,
                };
                res.redirect("/admin/liste-utilisateur");
              }
            }
          );
        } else {
          app.locals.message = {
            class: "danger",
            texte: `L'utilisateur à mofidier est inconnu.`,
          };
          res.redirect("/admin/liste-utilisateur");
        }
      });
    });
  }
});
//root pour supprimer un utilisateur
app.get("/admin/supprimer-utilisateur/:pseudo", (req, res, next) => {
  MongoClient.connect(urlDB, { useUnifiedTopology: true }, (err, client) => {
    if (err) return;
    const collection = client.db(nameDb).collection("collection");
    collection.find({ pseudo: req.params.pseudo }).toArray((err, data) => {
      if (data.length) {
        collection.deleteOne({ pseudo: req.params.pseudo }, (err, r) => {
          app.locals.message = {
            class: "success",
            texte: `L'utilisateur à bien été supprimé.`,
          };
          client.close();
          res.redirect("/admin/liste-utilisateur");
        });
      } else {
        client.close();
        app.locals.message = {
          class: "danger",
          texte: `L'utilisateur à supprimer est inconnu.`,
        };
        res.redirect("/admin/liste-utilisateur");
      }
    });
  });
});

app.listen("8888", () => console.log("Écoute sur le port 8888"));
