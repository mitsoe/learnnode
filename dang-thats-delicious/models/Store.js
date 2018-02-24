const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates'
        }],
        address: {
            type: String,
            required: 'You must supply an address'
        }
    },
    photo: String,
    author: {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        required: 'You must supply an author'
    }
}, {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    });

// Define our indexes
storeSchema.index({
    name: 'text',
    description: 'text',
});

storeSchema.index({
    location: '2dsphere'
})

storeSchema.pre('save', async function (next) {
    if (!this.isModified('name')) {
        next();
        return;
    };
    this.slug = slug(this.name);
    // Find other stores that contain slug name, name-1, name-2
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');
    const storeWithSlug = await this.constructor.find({ slug: slugRegEx });
    if (storeWithSlug.length) {
        this.slug = `${this.slug}-${storeWithSlug.length + 1}`;
    }
    next();
});

storeSchema.statics.getTagsList = function () {
    return this.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]);
}

storeSchema.statics.getTopStores = function () {
    return this.aggregate([
        // Get stores
        { $lookup: { from: 'reviews', localField: '_id', foreignField: 'store', as: 'reviews' } },
        // More then 2 reviews only
        { $match: { 'reviews.1': { $exists: true } } },
        // Add average rating field
        {
            $project: {
                photo: '$$ROOT.photo',
                name: '$$ROOT.name',
                reviews: '$$ROOT.reviews',
                averageRating: { $avg: '$reviews.rating' }
            }
        },
        { $sort: { averageRating: -1 } },
        { $limit: 10 }
    ]);
}

// find reviews where the stores _id property === reviews store property
storeSchema.virtual('reviews', {
    ref: 'Review', // what model to link?
    localField: '_id', // which field on the store?
    foreignField: 'store' // which field on the review?
});

module.exports = mongoose.model('Store', storeSchema);