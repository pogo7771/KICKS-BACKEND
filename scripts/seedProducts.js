const sequelize = require('../config/database');
const Product = require('../models/Product');

const products = [
    {
        name: "Nike Air Max 90",
        brand: "Nike",
        price: 13000,
        category: "Sneakers",
        gender: "Men",
        images: {
            primary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/wzitsrb4OUcx9J/air-max-90-shoes-kRsBnD.png",
            secondary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/1a/air-max-90-shoes-kRsBnD.png"
        },
        description: "Nothing as fly, nothing as comfortable, nothing as proven. The Nike Air Max 90 stays true to its OG running roots with the iconic Waffle sole, stitched overlays and classic TPU accents.",
        stock: 50,
        inStock: true
    },
    {
        name: "Adidas Ultraboost Light",
        brand: "Adidas",
        price: 18000,
        category: "Running",
        gender: "Women",
        images: {
            primary: "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/a4f/ultraboost-light-running-shoes-white-HQ6351_01_standard.jpg",
            secondary: "https://assets.adidas.com/images/h_840,f_auto,q_auto,fl_lossy,c_fill,g_auto/b5e/ultraboost-light-running-shoes-white-HQ6351_02_standard.jpg"
        },
        description: "Experience epic energy with the new Ultraboost Light, our lightest Ultraboost ever. The magic lies in the Light BOOST midsole, a new generation of adidas BOOST.",
        stock: 30,
        inStock: true
    },
    {
        name: "Puma Suede Classic",
        brand: "Puma",
        price: 6000,
        category: "Casual",
        gender: "Unisex",
        images: {
            primary: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/374915/01/sv01/fnd/IND/fmt/png/Suede-Classic-XXI-Sneakers",
            secondary: "https://images.puma.com/image/upload/f_auto,q_auto,b_rgb:fafafa,w_2000,h_2000/global/374915/01/sv03/fnd/IND/fmt/png/Suede-Classic-XXI-Sneakers"
        },
        description: "The Suede hit the scene in 1968 and has been changing the game ever since. It's been worn by the icons of every generation, and it's stayed classic through it all.",
        stock: 100,
        inStock: true
    },
    {
        name: "New Balance 574 Core",
        brand: "New Balance",
        price: 8999,
        category: "Sneakers",
        gender: "Men",
        images: {
            primary: "https://nb.scene7.com/is/image/NB/ml574evg_nb_02_i?$pdpflexf2$",
            secondary: "https://nb.scene7.com/is/image/NB/ml574evg_nb_05_i?$pdpflexf2$"
        },
        description: "The 574 was built to be a reliable shoe that could do a lot of different things well rather than as a platform for revolutionary technology, or as a premium materials showcase.",
        stock: 45,
        inStock: true
    },
    {
        name: "Nike Air Jordan 1 Low",
        brand: "Nike",
        price: 11000,
        category: "Sneakers",
        gender: "Men",
        images: {
            primary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/9a/air-jordan-1-low-shoes-6Q1tFM.png",
            secondary: "https://static.nike.com/a/images/t_PDP_1280_v1/f_auto,q_auto:eco/2b/air-jordan-1-low-shoes-6Q1tFM.png"
        },
        description: "Inspired by the original that debuted in 1985, the Air Jordan 1 Low offers a clean, classic look that's familiar yet always fresh.",
        stock: 15,
        inStock: true
    }
];

const seedProducts = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to database.');

        // Sync database (optional: use force: true to reset table)
        await Product.sync({ force: false }); // Keeping false to avoid losing existing data if any, change to true to reset

        // Option 1: Delete all and re-seed
        // await Product.destroy({ where: {}, truncate: true });

        // Option 2: Add if empty
        const count = await Product.count();
        if (count > 0) {
            console.log('Products already exist. Skipping seed.');
            process.exit(0);
        }

        await Product.bulkCreate(products);
        console.log('Products seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding products:', error);
        process.exit(1);
    }
};

seedProducts();
