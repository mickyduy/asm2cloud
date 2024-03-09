const express = require('express');
const router = express.Router();
const Product = require('../model/product');
const multer = require('multer');
const fs = require('fs');
const cloudinary = require('../utils/cloudinary')

// image upload
var storage = multer.diskStorage({
   destination: function(req, file, cb){
      cb(null, './uploads');
   },
   filename: function(req, file, cb){
      cb(null, file.fieldname + "_" + Date.now() + "_" + file.originalname);
   }
});

var upload = multer({
   storage: storage
}).single('image');

// insert a product
router.post('/add', upload, (req, res) => {
   // Tải lên hình ảnh lên Cloudinary
   cloudinary.uploader.upload(req.file.path)
      .then(result => {
         // Tạo sản phẩm với đường dẫn hình ảnh từ Cloudinary
         const product = new Product({
            name: req.body.name,
            model: req.body.model,
            size: req.body.size,
            material: req.body.material,
            image: result.secure_url // Đường dẫn hình ảnh từ Cloudinary
         });

         // Lưu sản phẩm vào cơ sở dữ liệu
         return product.save();
      })
      .then(() => {
         req.session.message = {
            type: 'success',
            message: 'Product added successfully'
         };
         res.redirect('/');
      })
      .catch(err => {
         res.json({ message: err.message, type: 'danger' });
      })
      .finally(() => {
         // Xóa tệp hình ảnh tạm sau khi tải lên thành công
         fs.unlinkSync(req.file.path);
      });
});

// get all products
router.get('/', (req, res) => {
   Product.find()
      .then(products => {
         res.render('index', { title: 'Home Page', product: products });
      })
      .catch(err => {
         res.json({ message: err.message });
      });
});

router.get('/add', (req, res) => {
   res.render('add_product', { title: 'Add Product' });
});

// update product
router.get('/edit/:id', (req, res) => {
   let id = req.params.id;
   Product.findById(id)
      .then(product => {
         if (product == null) {
            res.redirect('/');
         } else {
            res.render('edit_product', {
               title: "Edit product",
               product: product,
            });
         }
      })
      .catch(err => {
         res.redirect('/');
      });
});

router.post('/update/:id', upload, (req, res) => {
   let id = req.params.id;
   Product.findById(id)
      .then(product => {
         if (product == null) {
            res.redirect('/');
         } else {
            product.name = req.body.name;
            product.model = req.body.model;
            product.size = req.body.size;
            product.material = req.body.material;

            // Kiểm tra nếu có ảnh mới được tải lên
            if (req.file) {
               // Tải lên ảnh lên Cloudinary
               cloudinary.uploader.upload(req.file.path)
                  .then(result => {
                     // Lưu đường dẫn ảnh mới từ Cloudinary
                     product.image = result.secure_url;
                     return product.save();
                  })
                  .catch(err => {
                     res.redirect('/');
                  })
                  .finally(() => {
                     // Xóa tệp hình ảnh tạm sau khi tải lên thành công
                     fs.unlinkSync(req.file.path);
                  });
            } else {
               // Không có ảnh mới, chỉ lưu các thông tin khác
               return product.save();
            }
         }
      })
      .then(() => {
         req.session.message = {
            type: 'success',
            message: 'Product updated successfully'
         };
         res.redirect('/');
      })
      .catch(err => {
         res.redirect('/');
      });
});

// Update product
router.post('/update/:id', upload, (req, res) => {
   let id = req.params.id;
   let new_image = '';
   if (req.file) {
      new_image = req.file.filename;
      try {
         fs.unlinkSync('./uploads/' + req.body.old_image);
      } catch (err) {
         console.log(err);
      }
   } else {
      new_image = req.body.old_image;
   }
   Product.findByIdAndUpdate(id, {
      name: req.body.name,
      model: req.body.model,
      size: req.body.size,
      material: req.body.material,
      image: new_image,
   })
      .then(result => {
         req.session.message = {
            type: 'success',
            message: 'Product updated successfully'
         };
         res.redirect('/');
      })
      .catch(err => {
         res.json({ message: err.message, type: 'danger' });
      });
});

//delete product
router.get('/delete/:id', (req, res) => {
   let id = req.params.id;

   Product.findByIdAndRemove(id)
      .then(product => {
         if (product) {
            // Xóa tệp hình ảnh liên quan
            fs.unlinkSync('./uploads/' + product.image);

            req.session.message = {
               type: 'success',
               message: 'Product deleted successfully'
            };
         } else {
            req.session.message = {
               type: 'danger',
               message: 'Product not found'
            };
         }

         res.redirect('/');
      })
      .catch(err => {
         req.session.message = {
            type: 'danger',
            message: err.message
         };
         res.redirect('/');
      });
});


module.exports = router;
