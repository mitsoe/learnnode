const mongoose = require('mongoose');
const Store = mongoose.model('Store');
const User = mongoose.model('User');
const jimp = require('jimp');
const uuid = require('uuid');
const multer = require('multer');

const multerOptions = {
    storage: multer.memoryStorage(),
    fileFilter: (req, file, next) => {
        const isPhoto = file.mimetype.startsWith('image/')
        if (isPhoto) {
            next(null, true);
        } else {
            next({ message: `That file type isnt allowed` }, false);
        }
    }
}

exports.homePage = (req, res) => {
    console.log(req.name)
    res.render('index');
};

exports.addStore = (req, res) => {
    res.render('editStore', { title: 'Add Store' })
}

exports.upload = multer(multerOptions).single('photo');
exports.resize = async (req, res, next) => {
    // Check if there is a file
    if (!req.file) {
        next(); // Skip to next middleware
        return;
    }
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;
    // Now we resize
    const photo = await jimp.read(req.file.buffer);
    await photo.resize(800, jimp.AUTO);
    await photo.write(`./public/uploads/${req.body.photo}`);
    // Once we have written the photo to filesystem go on
    next();
}

exports.createStore = async (req, res) => {
    req.body.author = req.user._id;
    const store = await (new Store(req.body)).save();
    req.flash('success', `Created ${store.name}, NICE!`);
    res.redirect(`/store/${store.slug}`);
}

exports.getStores = async (req, res) => {
    // Query bd for list of stores
    const stores = await Store.find();
    res.render('stores', { title: 'Stores', stores })
}

const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own the Store to edit it');
    }
}

exports.editStore = async (req, res) => {
    // find the store given the id
    const store = await Store.findOne({ _id: req.params.id });
    // confirm they are the ownaaaa
    confirmOwner(store, req.user);
    // render out the edit form to update the store
    res.render('editStore', { title: 'Edit Store', store });
}

exports.updateStore = async (req, res) => {
    // Set location data to be a point
    req.body.location.type = 'Point';
    // find the store given the id and update it
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true, //gets new data instead of old
        runValidators: true,
    }).exec();
    req.flash('success', `Succesfuly update ${store.name} ${store._id}`);
    res.redirect(`/stores/${store._id}/edit`)
    // redirect them to the store and tell them it works
}

exports.getStoreBySlug = async (req, res, next) => {
    const store = await Store.findOne({ slug: req.params.slug }).populate('author');
    if (!store) return next();
    res.render('store', { store })
}

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };
    const tagsPromise = Store.getTagsList();
    const storesPromise = Store.find({ tags: tagQuery })
    const [tags, stores] = await Promise.all([
        tagsPromise,
        storesPromise
    ])
    res.render('tag', { tags, title: 'Tags', tag, stores });
};

exports.searchStores = async (req, res) => {
    const stores = await Store.find({
        $text: {
            $search: req.query.q
        }
    }, {
            score: { $meta: 'textScore' }
        }).sort({
            score: { $meta: 'textScore' }
        });
    res.json(stores);
}

exports.mapStores = async (req, res) => {
    const coords = [req.query.lng, req.query.lat].map(parseFloat);

    const query = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: coords
                },
                $maxDistance: 10000
            }
        }

    }

    const stores = await Store.find(query).select('slug name description location').limit(10);
    res.json(stores);
}


exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' });
}

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User.findByIdAndUpdate(
        req.user._id,
        { [operator]: { hearts: req.params.id } },
        { new: true }
    );
    console.log(hearts)
    res.json(user)
}

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts }
    });
    res.render('stores', { title: 'Hearted Stores', stores })
}